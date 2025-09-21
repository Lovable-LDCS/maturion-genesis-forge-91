import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './lib/constants.ts';
import { buildPromptContext, constructFinalPrompt, type PromptRequest } from './lib/prompt.ts';
import { detectMissingSpecifics, createGapTicket, generateCommitmentText } from './lib/gap-tracker.ts';
import { supabase, sanitizeInput } from './lib/utils.ts';
import { ConversationStateManager } from './lib/conversation-state.ts';

// OpenAI embeddings function
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

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

    // Sanitize input and log
    const sanitizedPrompt = sanitizeInput(normalizedPrompt);
    console.log('[Gate D] InputSanitization', { before: normalizedPrompt.length, after: sanitizedPrompt.length });

    const orgId = body.orgId || body.organizationId || null;
    const domainFilters = Array.isArray(body?.domainFilters) && body.domainFilters.length > 0
      ? body.domainFilters
      : [];
    
    // Define requested document types for filtering
    const requestedDocTypes = Array.isArray(body?.requestedDocTypes) && body.requestedDocTypes.length > 0
      ? body.requestedDocTypes
      : [];


    const request: PromptRequest = {
      ...(body as any),
      prompt: sanitizedPrompt,
      organizationId: orgId,
      domainFilters,
      requestedDocTypes,
    };

    // Payload log for Gate D
    console.log('[Gate D] maturion-ai-chat payload', { orgId, domainFilters });

    console.log('🔍 Starting AI chat request processing...');
    console.log('🧾 Input summary:', { hasMessages, orgId, domainFiltersCount: domainFilters.length });
    
    // Build comprehensive prompt context based on knowledge tier
    const promptContext = await buildPromptContext(request);

    // Retrieval QA Implementation
    let sources: Array<{ id: string; document_id: string; document_title: string; doc_type: string; score: number }> = [];
    let retrievedContexts: string[] = [];

    if (orgId && sanitizedPrompt.trim()) {
      const startTime = Date.now();
      try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          console.warn('⚠️ OpenAI API key not configured - using fallback retrieval');
        } else {
          // 1) Generate embedding for the question
          const embedding = await generateEmbedding(sanitizedPrompt, OPENAI_API_KEY);
          
          // 2) Call match_ai_chunks via Supabase RPC
          const { data: hits, error } = await supabase.rpc('match_ai_chunks', {
            p_org_id: orgId,
            p_query_embedding: `[${embedding.join(',')}]`,
            p_match_count: 8,
            p_min_score: 0.2,
          });

          if (error) {
            console.warn('⚠️ match_ai_chunks error:', error);
          } else if (hits && hits.length > 0) {
            console.log(`🎯 Retrieved ${hits.length} relevant chunks`);
            
            // 3) Build context from top chunks (de-dup doc titles, cap ~3-5k chars)
            const seenTitles = new Set<string>();
            let totalChars = 0;
            const maxChars = 4500;
            
            for (const hit of hits) {
              if (totalChars >= maxChars) break;
              
              const contextItem = `Source: ${hit.document_title} (${hit.doc_type})\n${hit.content}`;
              const itemLength = contextItem.length;
              
              if (totalChars + itemLength <= maxChars) {
                retrievedContexts.push(contextItem);
                totalChars += itemLength;
                
                // Collect unique sources for display
                if (!seenTitles.has(hit.document_title)) {
                  seenTitles.add(hit.document_title);
                  sources.push({
                    id: hit.id,
                    document_id: hit.document_id,
                    document_title: hit.document_title,
                    doc_type: hit.doc_type,
                    score: hit.score
                  });
                }
              }
            }
            
            console.log(`📄 Built context from ${retrievedContexts.length} chunks (${totalChars} chars)`);
          }
        }
      } catch (retrievalErr) {
        console.warn('⚠️ Retrieval QA error:', retrievalErr);
      }
    }

    // Use retrieved context if available, otherwise fall back to existing logic
    if (retrievedContexts.length > 0) {
      promptContext.documentContext = retrievedContexts;
    }

    // Log sources for Gate D
    console.log('[Gate D] sources=', sources.slice(0, 10).map(s => ({ 
      title: s.document_title, 
      type: s.doc_type, 
      score: s.score?.toFixed(2) 
    })));

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
    
    // Construct and send the OpenAI request with conversation context
    const conversationManager = new ConversationStateManager(
      request.organizationId || '', 
      undefined // We could get userId from auth context if needed
    );

    // Build contextual input for multi-turn conversations
    const contextualInput = await conversationManager.buildContextualInput(finalPrompt);
    
    console.log('🤖 Generating AI response...');
    let aiResponse: string;
    let responseId: string | undefined;

    if (sources.length === 0) {
      // Fallback only when zero results
      aiResponse = `🔄 I'm currently processing your uploaded documents and preparing diamond-specific guidance. In the meantime, here are immediate recommendations:\n\n- Recommendation — Action: Establish dual custody and tamper-evident seals for any in-transit parcels; daily variance checks by Logistics Supervisor.\n- Recommendation — Action: Enable black-screen monitoring for high-risk areas; weekly variance review by Protection lead.\n- Recommendation — Action: Run 3-2-1 backups with monthly restore tests; Evidence Manager to attest quarterly.\n\nOnce processing completes I'll reference your Organization Profile and Diamond Knowledge Pack directly.`;
      console.log('ℹ️ No KB sources available; returned friendly fallback.');
    } else {
      try {
        // Enhanced API call with conversation context and tools
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5',
            instructions: `You are Maturion, an AI-first platform for security, maturity, and operational excellence. Follow the Maturion Operating Policy & Governance and provide evidence-first, diamond-specific guidance.`,
            input: contextualInput,
            tools: [
              { type: 'web_search' },
              { type: 'file_search' }
            ],
            previous_response_id: conversationManager.getLastResponseId(),
            max_completion_tokens: 2000,
            store: false,
            include: ['reasoning.encrypted_content']
          }),
        });

        if (!openAIResponse.ok) {
          throw new Error(`OpenAI API error: ${openAIResponse.status}`);
        }

        const responseData = await openAIResponse.json();
        aiResponse = responseData.output_text;
        responseId = responseData.id;
        
        // Store conversation turn for future context
        if (request.organizationId) {
          await conversationManager.storeConversationTurn(
            request.prompt, 
            aiResponse, 
            responseId
          );
        }
        
        console.log('✅ AI response generated successfully with enhanced context');
      } catch (modelErr) {
        const msg = (modelErr as any)?.message || String(modelErr);
        console.warn('⚠️ OpenAI unavailable, synthesizing from retrieved chunks:', msg);
        // Minimal synthesis using retrieved chunks to avoid hard fallback
        const snippet = promptContext.documentContext
          .slice(0, 6)
          .map((s: string) => '- ' + (s.split('\n').slice(1).join(' ').slice(0, 200)))
          .join('\n');
        aiResponse = `Here is a synthesized summary from retrieved sources:\n${snippet}`;
      }
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

    // Append sources list when available
    if (sources.length > 0) {
      const sourcesList = sources.slice(0, 5).map(s => `- ${s.document_title} (${s.doc_type}) [score: ${s.score?.toFixed(2)}]`).join('\n');
      finalResponse += `\n\nSources:\n${sourcesList}`;
    } else if (!promptContext || (Array.isArray(promptContext.documentContext) && promptContext.documentContext.length === 0)) {
      // Friendly fallback when org docs aren’t ready
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
      activeFilters: { organizationId: orgId, docTypes: requestedDocTypes.length > 0 ? requestedDocTypes : ['ALL_COMPLETED'] },
      sources: sources.map(s => ({
        document_title: s.document_title,
        doc_type: s.doc_type,
        score: s.score
      })),
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