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
const generateInformativeFallback = (prompt: unknown, error: any): string => {
  // Normalize prompt to plain text for safe processing
  const promptText = Array.isArray(prompt)
    ? prompt.map((p: any) => (typeof p === 'string' ? p : p?.content ?? '')).join('\n')
    : String(prompt ?? '');

  console.log('🔄 Generating informative fallback for prompt:', promptText.substring(0, 120));
  const lower = promptText.toLowerCase();

  // 1) Specific MPS criteria request
  const mpsMatch = /mps\s*(\d{1,2})/i.exec(promptText);
  const wantsCriteria = /\b(criteria|audit criteria|generate criteria|controls|requirements)\b/i.test(lower);
  const titleMatch = /mps\s*\d{1,2}\s*[:\-]\s*([^\n]+)$/i.exec(promptText);
  if (mpsMatch && wantsCriteria) {
    const num = mpsMatch[1];
    const title = titleMatch ? titleMatch[1].trim() : 'Specified MPS';
    const heading = `AUDIT CRITERIA FOR MPS ${num} - ${title}`;
    // Evidence-first, diamond-specific, plain text
    const bullets = [
      'A documented procedure that defines roles, approvals, and handoffs for this MPS.',
      'A calibrated equipment register that records serials, location, calibration dates, and next-due dates.',
      'A calibration certificate archive with traceability to standards and out-of-tolerance disposition.',
      'A measurement log that captures inputs, readings, anomalies, and operator signatures for each run.',
      'An exception workflow that logs anomalies, triage actions, compensating controls, and final resolution.',
      'Dual data stream capture with automated variance thresholds and real-time alarms.',
      'An independent verification record (second-person or system check) for critical steps.',
      'A daily dashboard that shows KPIs, tolerance breaches, downtime, and reasons codes.',
      'A change control record for procedures/equipment with risk assessment and approvals.',
      'A monthly management review minutes pack with trends, corrective actions, and owners with due dates.'
    ];
    return [heading, '', ...bullets.map(b => `- ${b}`)].join('\n');
  }

  // 2) Framework/domain questions
  if (/(domains?|framework|structure|outline|maturity model)/i.test(lower)) {
    return `MATURITY FRAMEWORK - FIVE CORE DOMAINS\n\n1. Leadership & Governance\n- Oversight, custody, accountability\n\n2. Process Integrity\n- Reconciliation, sorting/valuation, controls\n\n3. People & Culture\n- Insider threat, vetting, access reviews\n\n4. Protection\n- Physical security, access controls, technology safeguards\n\n5. Proof it Works\n- Assurance, testing, evidence and records integrity`;
  }

  // 3) General fallback
  return `I can help with your maturity assessment. Tell me the domain/MPS and whether you want criteria, evidence examples, or actions.`;
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

const systemPromptA = `You are Maturion, an AI assistant specializing in maturity models and organizational development. 
                
Key Guidelines:
- Provide diamond-first, answer-first responses
- Use requirement-evidence-action format with bullets
- Include cadences (daily/weekly/monthly/quarterly) and owners
- Focus on technology-first controls and defense-in-depth
- No meta-discussion or uncertainty language
- When you don't have specific data, provide general best practices for the domain requested`;

const chatMessagesA = Array.isArray(contextualInput)
  ? [{ role: 'system', content: systemPromptA }, ...contextualInput]
  : [{ role: 'system', content: systemPromptA }, { role: 'user', content: contextualInput }];

const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: chatMessagesA,
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

        // Dynamic system prompt selection to avoid framework echo on MPS criteria requests
        const lower = (request.prompt || '').toLowerCase();
        const mpsMatch = /mps\s*(\d{1,2})/i.exec(lower);
        const mpsNum = mpsMatch ? mpsMatch[1] : '';
        const wantsCriteria = /\b(criteria|audit criteria|controls|requirements)\b/i.test(lower);
        const isFrameworkQuery = /\b(domains?|framework|structure|outline|maturity model|five domains|5 domains)\b/i.test(lower) && !(mpsMatch && wantsCriteria);

        let systemContent = 'You are Maturion, an AI-first platform for security, maturity, and operational excellence.\n\nRESPONSE FORMAT REQUIREMENTS:\n- Use plain text only, no markdown formatting\n- Use clear headers without asterisks or special characters\n- Provide clean, structured responses\n- Use bullet points with simple dashes (-)';

        if (isFrameworkQuery) {
          systemContent += '\n\nMATURITY FRAMEWORK - FIVE CORE DOMAINS\n\n1. Leadership & Governance\n   MPS 1: Governance & Oversight - Board oversight, executive accountability, variance management\n   MPS 2: Chain of Custody - Asset tracking, custody protocols, handoff procedures\n   MPS 3: KPI Dashboards - Performance monitoring, reporting frameworks, variance alerts\n   MPS 4: Risk Assessment - Risk identification, assessment protocols, mitigation strategies\n   MPS 5: Regulatory Compliance - Compliance frameworks, audit preparation, attestations\n\n2. Process Integrity  \n   MPS 6: Reconciliation - Tolerance-based reconciliation, automated variance detection\n   MPS 7: Sorting & Valuation - Double-blind methodologies, independent verification\n   MPS 8: Plant Recovery - Calibration protocols, anomaly detection, dual data streams\n   MPS 9: Process Controls - Standard operating procedures, control point monitoring\n   MPS 10: Quality Assurance - Testing protocols, statistical process control\n\n3. People & Culture\n   MPS 11: Insider Threat - Behavioral monitoring, anomaly detection, reporting mechanisms\n   MPS 12: Personnel Vetting - Background screening, ongoing monitoring, clearance management\n   MPS 13: Access Management - Privilege reviews, rotation policies, dual presence\n   MPS 14: Training & Competency - Skills assessment, certification programs, refresher training\n   MPS 15: Culture & Ethics - Code of conduct, whistleblowing, incident response\n\n4. Protection\n   MPS 16: Physical Security - Perimeter defense, vault controls, mantrap access\n   MPS 17: Access Controls - Biometric systems, dual authorization, real-time monitoring\n   MPS 18: Technology Safeguards - Tamper detection, test stones, black-screen verification\n   MPS 19: Scanning & Detection - Automated scanning, anomaly alerts, validation procedures\n   MPS 20: Security Operations - Key control, alarm response, incident management\n\n5. Proof it Works\n   MPS 21: Assurance Framework - Independent verification, third-party audits, certification\n   MPS 22: Testing Protocols - Drill programs, red-team exercises, vulnerability assessments\n   MPS 23: Evidence Management - Chain of evidence, immutable logs, audit trails\n   MPS 24: Records Integrity - Data hashing, backup verification, restore testing\n   MPS 25: Resilience Planning - Fail-safe mechanisms, contingency planning, recovery procedures\n\nGuidelines:\n- Answer framework questions with framework content first\n- Always use plain text formatting';
        } else if (mpsMatch && wantsCriteria) {
          systemContent += `\n\nInstructions:\n- Do NOT output the framework list.\n- Generate 8-12 evidence-first audit criteria for MPS ${mpsNum}.\n- Phrase each as: A documented [document] that [action/verification]...\n- Include cadences (daily/weekly/monthly) and owners where applicable.`;
        } else {
          systemContent += '\n\nInstructions:\n- Do NOT output the framework list unless explicitly asked.\n- Use retrieved context to answer the user\'s request.';
        }

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
if (!OPENAI_API_KEY) {
  throw new Error('OpenAI API key not configured');
}

const chatMessagesB = Array.isArray(contextualInput)
  ? [{ role: 'system', content: systemContent }, ...contextualInput]
  : [{ role: 'system', content: systemContent }, { role: 'user', content: contextualInput }];

const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: chatMessagesB,
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
        
        // Use resilient plain-text fallback tailored to the prompt
        aiResponse = generateInformativeFallback(contextualInput, modelErr);
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