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

// Generate informative fallback response when AI fails
const generateInformativeFallback = (prompt: string, error: any): string => {
  console.log('🔄 Generating informative fallback for prompt:', prompt.substring(0, 100));
  
  // Analyze the prompt to provide relevant guidance
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('domain') || lowerPrompt.includes('maturity model')) {
    return `The main domains in the maturity model are:

• **Leadership & Governance** — Oversight frameworks, chain of custody protocols, and executive accountability structures
• **Process Integrity** — Reconciliation procedures, sorting methodologies, and operational variance controls  
• **People & Culture** — Personnel security, insider threat mitigation, and competency management
• **Protection** — Physical security, access controls, and technology safeguards
• **Proof it Works** — Assurance frameworks, testing protocols, and evidence management

Each domain contains specific criteria that organizations can assess and improve over time through a structured maturity progression.

Would you like me to elaborate on any specific domain or discuss how to get started with your assessment?`;
  }
  
  if (lowerPrompt.includes('table') || lowerPrompt.includes('data') || lowerPrompt.includes('analy')) {
    return `For data analysis and table operations:

• **Data Structure** — I can help you understand your database schema and relationships
• **Analytics** — I can guide you through interpreting trends and patterns in your data
• **Reporting** — I can assist with generating meaningful insights from your metrics
• **Next Steps** — I can recommend actions based on your data patterns

What specific aspect of your data would you like to explore? I can provide guidance on analysis techniques, interpretation methods, or help you identify key performance indicators.`;
  }
  
  // General fallback
  return `I'm here to help with your maturity assessment and operational excellence goals. Here are immediate ways I can assist:

• **Assessment Guidance** — Help you understand maturity models and evaluation frameworks
• **Process Improvement** — Provide recommendations for operational enhancements
• **Best Practices** — Share industry-standard approaches for your specific challenges
• **Next Steps** — Guide you through implementation planning and prioritization

What specific area would you like to focus on? I can provide detailed guidance tailored to your organization's needs.`;
};

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
          const { data: initialHits, error } = await supabase.rpc('match_ai_chunks', {
            p_org_id: orgId,
            p_query_embedding: `[${embedding.join(',')}]`,
            p_match_count: 8,
            p_min_score: 0.2,
          });

          let hits = initialHits;

          if (error) {
            console.error('❌ match_ai_chunks error:', error);
            console.error('   Organization ID:', orgId);
            console.error('   Embedding length:', embedding?.length);
            
            // Fallback to search-ai-context function
            console.log('🔄 Falling back to search-ai-context function...');
            try {
              const searchResponse = await supabase.functions.invoke('search-ai-context', {
                body: {
                  query: sanitizedPrompt,
                  organizationId: orgId,
                  limit: 8,
                  threshold: 0.2
                }
              });
              
              if (searchResponse.data?.success && searchResponse.data?.results?.length > 0) {
                console.log(`🎯 Fallback search retrieved ${searchResponse.data.results.length} results`);
                const fallbackHits = searchResponse.data.results.map((result: any) => ({
                  id: result.chunk_id,
                  document_id: result.document_id,
                  content: result.content,
                  document_title: result.document_name,
                  doc_type: result.document_type,
                  score: result.similarity
                }));
                hits = fallbackHits;
              }
            } catch (fallbackError) {
              console.error('⚠️ Fallback search also failed:', fallbackError);
            }
          }
          
          if (hits && hits.length > 0) {
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
      // Generate AI response even without specific sources - use general reasoning
      console.log('🤖 No specific sources found, generating AI response with general context...');
      try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are Maturion, an AI assistant specializing in maturity models and organizational development. 
                
Key Guidelines:
- Provide diamond-first, answer-first responses
- Use requirement-evidence-action format with bullets
- Include cadences (daily/weekly/monthly/quarterly) and owners
- Focus on technology-first controls and defense-in-depth
- No meta-discussion or uncertainty language
- When you don't have specific data, provide general best practices for the domain requested`
              },
              {
                role: 'user',
                content: contextualInput
              }
            ],
            max_tokens: 1000,
            temperature: 0.7
          }),
        });

        if (!openAIResponse.ok) {
          const errorData = await openAIResponse.text();
          throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorData}`);
        }

        const aiData = await openAIResponse.json();
        aiResponse = aiData.choices[0].message.content;
        
        console.log('✅ Generated AI response without specific knowledge sources');
      } catch (aiError) {
        console.error('❌ AI generation failed:', aiError);
        // Provide a more informative fallback based on the original query
        const fallbackResponse = generateInformativeFallback(contextualInput, aiError);
        aiResponse = fallbackResponse;
      }
    } else {
      try {
        // Enhanced API call with conversation context and tools
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are Maturion, an AI-first platform for security, maturity, and operational excellence. 

RESPONSE FORMAT REQUIREMENTS:
- Use plain text only, no markdown formatting
- Use clear headers without asterisks or special characters
- Provide clean, structured responses
- Use bullet points with simple dashes (-)

CRITICAL: When asked about "main domains", "framework structure", "5 domains", or "domain outline", provide this complete structure:

MATURITY FRAMEWORK - FIVE CORE DOMAINS

1. Leadership & Governance
- Chain of custody protocols and executive accountability
- Governance oversight frameworks and variance management
- Key Performance Indicator (KPI) dashboards and reporting
- Risk assessment and regulatory compliance oversight
- Executive attestations and RACI accountability matrices

2. Process Integrity  
- Reconciliation procedures with defined tolerances and cadences
- Sorting and valuation methodologies with double-blind controls
- Plant recovery operations with calibration and anomaly detection
- Dual data stream monitoring and variance alarms
- Standard Operating Procedures (SOPs) and process controls

3. People & Culture
- Insider threat mitigation and behavioral monitoring
- Enhanced personnel vetting and background screening
- Dual presence requirements and personnel rotation
- Access reviews and privilege management (monthly cadence)
- Whistleblowing mechanisms and incident reporting

4. Protection
- Physical security including perimeter defense and vault controls
- Access controls with biometric authentication and dual authorization
- Technology safeguards including tamper detection and test stones
- Scanning systems with black-screen verification procedures
- Mantraps, key control, and alarm response protocols

5. Proof it Works
- Assurance frameworks and independent verification
- Testing protocols including drills and red-team exercises
- Evidence management with immutable audit trails
- Records integrity with hashing, signatures, and backup testing
- Resilience planning with fail-safe mechanisms and contingencies

Each domain contains multiple Management Performance Standards (MPS) that define specific operational requirements and evidence criteria.

For specific operational questions, use the retrieved context for detailed implementation guidance.

Guidelines:
- Answer framework questions with framework content first
- Provide diamond-first, evidence-based responses  
- Use requirement-evidence-action format for operational details
- Include cadences and owners for specific implementations
- Focus on technology-first controls and defense-in-depth
- Always use plain text formatting, no markdown or special characters`
              },
              {
                role: 'user',
                content: contextualInput
              }
            ],
            max_tokens: 1000,
            temperature: 0.7
          }),
        });

        if (!openAIResponse.ok) {
          const errorData = await openAIResponse.text();
          console.error('❌ OpenAI API error:', openAIResponse.status, errorData);
          throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorData}`);
        }

        const responseData = await openAIResponse.json();
        aiResponse = responseData.choices[0].message.content;
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
        
        // Try to synthesize from retrieved chunks, otherwise use informative fallback
        if (promptContext.documentContext && promptContext.documentContext.length > 0) {
          // Provide a clean, plain-text framework overview instead of noisy synthesis
          aiResponse = `MATURITY FRAMEWORK - FIVE CORE DOMAINS\n\n1. Leadership & Governance\n- Chain of custody protocols, executive accountability, governance oversight\n\n2. Process Integrity\n- Reconciliation procedures, sorting/valuation methodologies, operational controls\n\n3. People & Culture\n- Insider threat mitigation, enhanced vetting, dual presence and access reviews\n\n4. Protection\n- Physical security, access controls, tamper detection and scanning safeguards\n\n5. Proof it Works\n- Assurance frameworks, testing protocols, evidence and records integrity`;
        } else {
          // Use informative fallback when no sources are available
          aiResponse = generateInformativeFallback(contextualInput, modelErr);
        }
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