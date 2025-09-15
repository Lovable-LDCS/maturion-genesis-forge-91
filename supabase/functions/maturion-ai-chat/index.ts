import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './lib/constants.ts';
import { buildPromptContext, callOpenAI, constructFinalPrompt, type PromptRequest } from './lib/prompt.ts';
import { detectMissingSpecifics, createGapTicket, generateCommitmentText } from './lib/gap-tracker.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input (supports both messages[] and prompt)
    const body = await req.json().catch(() => ({} as any));

    // Basic validation: require either messages[] or prompt
    const hasMessages = Array.isArray(body?.messages) && body.messages.length > 0;
    const rawPrompt: string | undefined = typeof body?.prompt === 'string' ? body.prompt : undefined;

    if (!hasMessages && (!rawPrompt || rawPrompt.trim().length === 0)) {
      return new Response(JSON.stringify({ error: 'messages or prompt required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize to PromptRequest
    const normalizedPrompt = hasMessages
      ? body.messages.map((m: any) => (typeof m?.content === 'string' ? m.content : '')).join('\n')
      : rawPrompt!.trim();

    const orgId = body.orgId || body.organizationId || null;
    const domainFilters = Array.isArray(body?.domainFilters) && body.domainFilters.length > 0
      ? body.domainFilters
      : ["Organization Profile", "Diamond Knowledge Pack"];

    const request: PromptRequest = {
      ...(body as any),
      prompt: normalizedPrompt,
      organizationId: orgId,
      domainFilters,
    };
    
    console.log('🔍 Starting AI chat request processing...');
    console.log('🧾 Input summary:', { hasMessages, orgId, domainFiltersCount: domainFilters.length });
    
    // Build comprehensive prompt context based on knowledge tier
    const promptContext = await buildPromptContext(request);
    
    // CRITICAL: Construct final prompt with token limiting and cleanup
    const finalPrompt = constructFinalPrompt(promptContext);
    
    // Log detailed prompt metrics for debugging
    const finalTokens = Math.ceil(finalPrompt.length / 4);
    console.log(`🔍 FINAL PROMPT METRICS:`);
    console.log(`   Total length: ${finalPrompt.length} characters`);
    console.log(`   Estimated tokens: ${finalTokens}`);
    console.log(`   Within 12K limit: ${finalTokens <= 12000 ? '✅' : '❌'}`);
    
    // Check for remaining placeholder patterns as final safety check
    const placeholderCheck = [
      /\[document_type\]/gi,
      /\[action_verb\]/gi,
      /\[requirement\]/gi,
      /\bCriterion\s+[A-Z](?=\s*$|\s*\.|\s*,)/gi,
      /\bAssessment criterion\b/gi
    ];
    
    let hasPlaceholders = false;
    placeholderCheck.forEach((pattern, index) => {
      const matches = finalPrompt.match(pattern);
      if (matches) {
        console.error(`🚨 PLACEHOLDER STILL PRESENT [${index + 1}]: ${pattern.source} (${matches.length} matches)`);
        console.error(`   Examples: ${matches.slice(0, 3).join(', ')}`);
        hasPlaceholders = true;
      }
    });
    
    if (hasPlaceholders) {
      console.error('❌ Placeholders detected in final prompt - aborting generation');
      throw new Error('PLACEHOLDER_VALIDATION_FAILED: Placeholder patterns detected in final prompt');
    }
    
    if (finalTokens > 12000) {
      console.error(`❌ Token limit exceeded: ${finalTokens} > 12000`);
      throw new Error(`TOKEN_LIMIT_EXCEEDED: Prompt has ${finalTokens} tokens (limit: 12,000)`);
    }
    
    console.log('✅ Final prompt passed all safety checks - proceeding with AI generation');
    
    // Generate AI response
    console.log('🤖 Generating AI response...');
    let aiResponse: string;
    try {
      aiResponse = await callOpenAI(finalPrompt);
      console.log('✅ AI response generated successfully');
    } catch (modelErr) {
      const msg = (modelErr as any)?.message || String(modelErr);
      console.warn('⚠️ OpenAI unavailable, using friendly fallback:', msg);
      aiResponse = `🔄 I'm currently processing your uploaded documents and preparing diamond-specific guidance. In the meantime, here are immediate recommendations:\n\n- Recommendation — Action: Establish dual custody and tamper-evident seals for any in-transit parcels; daily variance checks by Logistics Supervisor.\n- Recommendation — Action: Enable black-screen monitoring for high-risk areas; weekly variance review by Protection lead.\n- Recommendation — Action: Run 3-2-1 backups with monthly restore tests; Evidence Manager to attest quarterly.\n\nWhen processing completes I'll reference your Organization Profile and Diamond Knowledge Pack directly.`;
    }
    
    // DIAMOND-FIRST: Detect missing specifics and create gap tickets
    const missingSpecifics = detectMissingSpecifics(request.prompt, aiResponse);
    let gapTicketId: string | null = null;
    let commitmentText = '';
    
    if (missingSpecifics.length > 0 && promptContext.organizationContext) {
      console.log(`🎯 Detected ${missingSpecifics.length} missing specifics:`, missingSpecifics);
      
      // Extract organization ID from context
      const orgId = request.organizationId;
      
      if (orgId) {
        gapTicketId = await createGapTicket(orgId, request.prompt, missingSpecifics);
        commitmentText = generateCommitmentText(missingSpecifics);
        
        console.log(`📝 Gap ticket created: ${gapTicketId}`);
      }
    }
    
    // Append commitment text to response if gaps were detected
    let finalResponse = aiResponse + commitmentText;

    // Friendly fallback when org docs aren’t ready
    if (!promptContext || (Array.isArray(promptContext.documentContext) && promptContext.documentContext.length === 0)) {
      finalResponse = `I’m still processing your organization documents; using general context for now.\n\n` + finalResponse;
    }
    
    // Return the response with metadata
    return new Response(JSON.stringify({
      content: finalResponse, // Use final response with commitment text
      response: finalResponse,
      sourceType: promptContext.sourceType,
      knowledgeTier: promptContext.knowledgeTier,
      hasDocumentContext: promptContext.documentContext.length > 0,
      hasOrganizationContext: promptContext.organizationContext.length > 0,
      hasExternalContext: promptContext.externalContext.length > 0,
      gapTicketId: gapTicketId, // Include gap ticket ID for tracking
      missingSpecifics: missingSpecifics,
      promptMetrics: {
        totalLength: finalPrompt.length,
        estimatedTokens: finalTokens,
        withinLimit: finalTokens <= 12000
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in maturion-ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});