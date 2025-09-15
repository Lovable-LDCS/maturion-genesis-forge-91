import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './lib/constants.ts';
import { buildPromptContext, callOpenAI, constructFinalPrompt, type PromptRequest } from './lib/prompt.ts';
import { detectMissingSpecifics, createGapTicket, generateCommitmentText } from './lib/gap-tracker.ts';
import { supabase, sanitizeInput } from './lib/utils.ts';

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
      : ["Organization Profile", "Diamond Knowledge Pack"];

    const request: PromptRequest = {
      ...(body as any),
      prompt: sanitizedPrompt,
      organizationId: orgId,
      domainFilters,
    };

    // Payload log for Gate D
    console.log('[Gate D] maturion-ai-chat payload', { orgId, domainFilters });

    console.log('🔍 Starting AI chat request processing...');
    console.log('🧾 Input summary:', { hasMessages, orgId, domainFiltersCount: domainFilters.length });
    
    // Build comprehensive prompt context based on knowledge tier
    const promptContext = await buildPromptContext(request);

    // Map domain filters to doc_type values and retrieve org-specific sources
    const docTypeMap: Record<string, string> = {
      "Organization Profile": "organization_profile",
      "Diamond Knowledge Pack": "diamond_knowledge_pack",
      "Web Crawl": "web_crawl"
    };
    let requestedDocTypes: string[] = (domainFilters || []).map((d: string) => docTypeMap[d] || d).filter(Boolean);
    if (!requestedDocTypes.includes('diamond_knowledge_pack')) requestedDocTypes.push('diamond_knowledge_pack');

    let sources: Array<{ file_name: string; doc_type: string; document_id: string; chunk_id: string }> = [];
    let retrievedContexts: string[] = [];

    if (orgId) {
      try {
        const { data: docs, error: docErr } = await supabase
          .from('ai_documents')
          .select('id, file_name, doc_type')
          .eq('organization_id', orgId)
          .eq('processing_status', 'completed')
          .gt('total_chunks', 0)
          .in('doc_type', requestedDocTypes)
          .order('updated_at', { ascending: false })
          .limit(25);

        if (docErr) {
          console.warn('⚠️ Doc retrieval error:', docErr);
        } else if (docs && docs.length > 0) {
          const docMap = new Map<string, { file_name: string; doc_type: string }>();
          const docIds = docs.map((d: any) => {
            docMap.set(d.id, { file_name: d.file_name, doc_type: d.doc_type });
            return d.id;
          });

          const { data: chunks, error: chunkErr } = await supabase
            .from('ai_document_chunks')
            .select('id, document_id, content, chunk_index')
            .in('document_id', docIds)
            .order('chunk_index', { ascending: true })
            .limit(60);

          if (chunkErr) {
            console.warn('⚠️ Chunk retrieval error:', chunkErr);
          } else {
            const topChunks = (chunks || []).slice(0, 24);
            for (const ch of topChunks) {
              const meta = docMap.get(ch.document_id);
              if (!meta) continue;
              retrievedContexts.push(
                `Source: ${meta.file_name} (${meta.doc_type}) [doc:${ch.document_id} chunk:${ch.id}]\n${ch.content}`
              );
              sources.push({
                file_name: meta.file_name,
                doc_type: meta.doc_type,
                document_id: ch.document_id,
                chunk_id: ch.id
              });
            }
          }
        }
      } catch (retrievalErr) {
        console.warn('⚠️ Retrieval exception:', retrievalErr);
      }
    }

    if (retrievedContexts.length > 0) {
      // Prioritize retrieved contexts as the authoritative KB for this org
      promptContext.documentContext = retrievedContexts;
    }

    // Log sources for Gate D
    console.log('[Gate D] sources=', sources.slice(0, 10));

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

    if (sources.length === 0) {
      // Fallback only when zero results
      aiResponse = `🔄 I'm currently processing your uploaded documents and preparing diamond-specific guidance. In the meantime, here are immediate recommendations:\n\n- Recommendation — Action: Establish dual custody and tamper-evident seals for any in-transit parcels; daily variance checks by Logistics Supervisor.\n- Recommendation — Action: Enable black-screen monitoring for high-risk areas; weekly variance review by Protection lead.\n- Recommendation — Action: Run 3-2-1 backups with monthly restore tests; Evidence Manager to attest quarterly.\n\nOnce processing completes I'll reference your Organization Profile and Diamond Knowledge Pack directly.`;
      console.log('ℹ️ No KB sources available; returned friendly fallback.');
    } else {
      try {
        aiResponse = await callOpenAI(finalPrompt);
        console.log('✅ AI response generated successfully');
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
      const sourcesList = sources.slice(0, 5).map(s => `- ${s.file_name} (${s.doc_type}) [doc:${s.document_id} chunk:${s.chunk_id}]`).join('\n');
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
      activeFilters: { organizationId: orgId, docTypes: requestedDocTypes },
      sources: sources,
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