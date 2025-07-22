import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Three-tiered knowledge model per AI Behavior & Knowledge Source Policy v2.0
const KNOWLEDGE_TIERS = {
  // Tier 1: Internal Secure Knowledge Base - STRICT enforcement for audit/compliance
  INTERNAL_SECURE: [
    'MPS generation', 'Intent statement generation', 'Criteria development',
    'Audit structure', 'Maturity level assessment', 'Compliance scoring',
    'Roadmap progression', 'Domain content creation', 'Maturity framework development',
    'evidence', 'scoring', 'compliance'
  ],
  
  // Tier 2: Organizational Context Layer - For tailoring to user context
  ORGANIZATIONAL_CONTEXT: [
    'organization', 'structure', 'size', 'roles', 'departments', 'team',
    'onboarding', 'metadata', 'context', 'tailoring'
  ],
  
  // Tier 3: External Awareness Layer - NEW: For threat detection and situational awareness
  EXTERNAL_AWARENESS: [
    'threat', 'risk horizon', 'industry threat', 'surveillance', 'awareness',
    'threat detection', 'emerging threat', 'situational awareness', 'risk intelligence',
    'threat trend', 'insider threat', 'diamond sector', 'threat alert'
  ]
};

// Function to get the AI Behavior & Knowledge Source Policy for enforcement
async function getAIBehaviorPolicy(organizationId: string) {
  try {
    const { data: policyChunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.title', 'AI Behavior & Knowledge Source Policy')
      .limit(5);
    
    if (error || !policyChunks?.length) {
      console.log('No AI Behavior Policy found, using default enforcement');
      return '';
    }
    
    return policyChunks.map(chunk => chunk.content).join('\n\n');
  } catch (error) {
    console.error('Error fetching AI Behavior Policy:', error);
    return '';
  }
}

// Function to get Enhanced Maturion Intent Prompt Logic
async function getIntentPromptLogic(organizationId: string) {
  try {
    const { data: logicChunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.title', 'Enhanced Maturion Intent Prompt Logic')
      .limit(5);
    
    if (error || !logicChunks?.length) {
      return '';
    }
    
    return logicChunks.map(chunk => chunk.content).join('\n\n');
  } catch (error) {
    console.error('Error fetching Intent Prompt Logic:', error);
    return '';
  }
}

// Function to retrieve internal documents from AI knowledge base
async function getInternalDocuments(organizationId: string, context: string) {
  try {
    const { data: documents, error } = await supabase
      .from('ai_documents')
      .select('title, domain, tags, metadata')
      .eq('organization_id', organizationId)
      .eq('processing_status', 'completed');
    
    if (error) {
      console.error('Error fetching internal documents:', error);
      return [];
    }
    
    return documents || [];
  } catch (error) {
    console.error('Error in getInternalDocuments:', error);
    return [];
  }
}

// Enhanced function to get relevant document chunks using semantic search
async function getDocumentContext(organizationId: string, query: string, domain?: string) {
  try {
    console.log('Fetching document context for organization:', organizationId, 'Query:', query);
    
    // First check if there are any completed documents
    const { data: completedDocs, error: docsError } = await supabase
      .from('ai_documents')
      .select('id, title, processing_status')
      .eq('organization_id', organizationId)
      .eq('processing_status', 'completed');
    
    if (docsError) {
      console.error('Error checking completed documents:', docsError);
      return '';
    }
    
    if (!completedDocs || completedDocs.length === 0) {
      console.log('No completed documents found. Checking processing status...');
      
      const { data: allDocs } = await supabase
        .from('ai_documents')
        .select('id, title, processing_status')
        .eq('organization_id', organizationId);
      
      console.log('Document processing status:', allDocs);
      return '';
    }
    
    console.log(`Found ${completedDocs.length} completed documents. Using enhanced search...`);
    
    // Use the enhanced search-ai-context function for semantic search
    const searchQueries = [
      query,
      domain ? `${domain} MPS Mini Performance Standards` : 'MPS standards',
      'Annex 1 MPS list requirements',
      domain ? `${domain} domain audit criteria` : 'audit criteria'
    ];
    
    let searchResults: any[] = [];
    
    // Perform multiple semantic searches to gather comprehensive context
    for (const searchQuery of searchQueries) {
      try {
        const searchResponse = await fetch(`${supabaseUrl}/functions/v1/search-ai-context`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            organizationId: organizationId,
            documentTypes: ['mps', 'standard', 'audit', 'criteria', 'annex'],
            limit: 15,
            threshold: 0.6
          })
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.success && searchData.results?.length > 0) {
            searchResults = [...searchResults, ...searchData.results];
            console.log(`Search query "${searchQuery}" returned ${searchData.results.length} results`);
          }
        }
      } catch (searchErr) {
        console.error(`Search failed for query "${searchQuery}":`, searchErr);
      }
    }
    
    // Remove duplicates and prioritize high-similarity results
    const uniqueResults = searchResults
      .filter((result, index, self) => 
        index === self.findIndex(r => r.chunk_id === result.chunk_id)
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 25); // Top 25 most relevant chunks
    
    if (uniqueResults.length === 0) {
      console.log('No semantic search results found, falling back to basic content search...');
      
      // Fallback to basic content search
      const { data: chunks, error } = await supabase
        .from('ai_document_chunks')
        .select('content, metadata, ai_documents!inner(title, domain)')
        .eq('organization_id', organizationId)
        .or('content.ilike.%MPS%,content.ilike.%Annex%,content.ilike.%Mini Performance Standard%')
        .limit(20);
      
      if (error) {
        console.error('Error in fallback search:', error);
        return '';
      }
      
      return chunks?.map(chunk => `[${chunk.ai_documents.title}] ${chunk.content}`).join('\n\n') || '';
    }
    
    console.log(`Found ${uniqueResults.length} unique semantic search results`);
    
    // Build structured context from search results
    let contextSections: string[] = [];
    let sourceDocuments = new Set<string>();
    
    // Prioritize Annex 1 or explicit MPS list content
    const annex1Results = uniqueResults.filter(result => 
      result.content.toLowerCase().includes('annex 1') ||
      result.content.toLowerCase().includes('annex i') ||
      result.content.includes('MPS 1') && result.content.includes('MPS 2')
    );
    
    if (annex1Results.length > 0) {
      contextSections.push('=== AUTHORITATIVE MPS SOURCE (Annex 1) ===');
      annex1Results.forEach(result => {
        contextSections.push(`[Document: ${result.document_name}] ${result.content}`);
        sourceDocuments.add(result.document_name);
      });
      contextSections.push('');
    }
    
    // Add domain-specific content if specified
    if (domain) {
      const domainResults = uniqueResults.filter(result => 
        result.content.toLowerCase().includes(domain.toLowerCase()) ||
        result.document_name.toLowerCase().includes(domain.toLowerCase())
      );
      
      if (domainResults.length > 0) {
        contextSections.push(`=== ${domain.toUpperCase()} DOMAIN CONTEXT ===`);
        domainResults.slice(0, 10).forEach(result => {
          contextSections.push(`[Document: ${result.document_name}] ${result.content}`);
          sourceDocuments.add(result.document_name);
        });
        contextSections.push('');
      }
    }
    
    // Add remaining high-relevance content
    const remainingResults = uniqueResults.filter(result => 
      !annex1Results.includes(result) && 
      (!domain || !result.content.toLowerCase().includes(domain.toLowerCase()))
    );
    
    if (remainingResults.length > 0) {
      contextSections.push('=== ADDITIONAL RELEVANT CONTENT ===');
      remainingResults.slice(0, 10).forEach(result => {
        contextSections.push(`[Document: ${result.document_name}] ${result.content}`);
        sourceDocuments.add(result.document_name);
      });
    }
    
    const finalContext = contextSections.join('\n');
    console.log(`Built context from ${sourceDocuments.size} source documents: ${Array.from(sourceDocuments).join(', ')}`);
    
    return finalContext;
  } catch (error) {
    console.error('Error getting enhanced document context:', error);
    return '';
  }
}

// Function to get relevant external insights based on organizational profile
async function getExternalInsights(organizationId: string, context: string) {
  try {
    console.log('Fetching external insights for organization:', organizationId);
    
    // Get organization profile for filtering
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('industry_tags, region_operating, risk_concerns, threat_sensitivity_level')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !org) {
      console.log('No organization profile found for external insights filtering');
      return '';
    }
    
    // Only fetch insights if threat sensitivity is Moderate or Advanced
    if (org.threat_sensitivity_level === 'Basic') {
      console.log('Basic threat sensitivity - skipping external insights');
      return '';
    }
    
    // Fetch relevant external insights
    const { data: insights, error: insightsError } = await supabase
      .from('external_insights')
      .select('title, summary, industry_tags, region_tags, threat_tags, risk_level, published_at, source_type, is_verified')
      .eq('is_verified', true) // Only verified insights
      .gte('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('published_at', { ascending: false })
      .limit(10);
    
    if (insightsError) {
      console.error('Error fetching external insights:', insightsError);
      return '';
    }
    
    if (!insights || insights.length === 0) {
      console.log('No recent external insights found');
      return '';
    }
    
    // Filter insights based on organizational profile
    const relevantInsights = insights.filter(insight => {
      // Check industry match
      const industryMatch = org.industry_tags?.some(tag => 
        insight.industry_tags?.includes(tag)
      );
      
      // Check region match
      const regionMatch = org.region_operating && 
        insight.region_tags?.includes(org.region_operating);
      
      // Check threat/risk concern match
      const threatMatch = org.risk_concerns?.some(concern => 
        insight.threat_tags?.includes(concern)
      );
      
      // Include global insights and profile matches
      return insight.industry_tags?.includes('Global') || 
             insight.region_tags?.includes('Global') ||
             industryMatch || regionMatch || threatMatch;
    });
    
    if (relevantInsights.length === 0) {
      console.log('No insights match organizational profile');
      return '';
    }
    
    console.log(`Found ${relevantInsights.length} relevant external insights`);
    
    // Format insights for AI context
    let insightsContext = '=== EXTERNAL THREAT INTELLIGENCE (ADVISORY ONLY) ===\n';
    insightsContext += `Matched to your risk profile: ${org.industry_tags?.join(', ')} | ${org.region_operating} | ${org.risk_concerns?.join(', ')}\n\n`;
    
    relevantInsights.forEach(insight => {
      insightsContext += `THREAT ALERT [${insight.risk_level} Risk]: ${insight.title}\n`;
      insightsContext += `Published: ${new Date(insight.published_at).toLocaleDateString()}\n`;
      insightsContext += `Summary: ${insight.summary}\n`;
      insightsContext += `Tags: Industry [${insight.industry_tags?.join(', ')}] | Region [${insight.region_tags?.join(', ')}] | Threats [${insight.threat_tags?.join(', ')}]\n`;
      insightsContext += `Source: ${insight.source_type} | Verified: ${insight.is_verified ? 'Yes' : 'No'}\n\n`;
    });
    
    insightsContext += 'NOTE: This external intelligence is ADVISORY ONLY and does not impact maturity scores or evidence decisions.\n';
    
    return insightsContext;
  } catch (error) {
    console.error('Error getting external insights:', error);
    return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      context, 
      currentDomain, 
      organizationId, 
      allowExternalContext = false,
      knowledgeBaseUsed = false,
      sourceDocuments = []
    } = await req.json();

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      console.error('Invalid or missing prompt in request');
      throw new Error('Prompt is required and must be a string');
    }

    // Determine knowledge tier requirements per AI Behavior & Knowledge Source Policy v2.0
    const requiresInternalSecure = KNOWLEDGE_TIERS.INTERNAL_SECURE.some(keyword => 
      prompt.toLowerCase().includes(keyword) || 
      context?.toLowerCase().includes(keyword) ||
      (currentDomain && keyword.includes('MPS'))
    );
    
    const isExternalAwarenessContext = KNOWLEDGE_TIERS.EXTERNAL_AWARENESS.some(keyword =>
      prompt.toLowerCase().includes(keyword) || 
      context?.toLowerCase().includes(keyword)
    );
    
    const isOrganizationalContext = KNOWLEDGE_TIERS.ORGANIZATIONAL_CONTEXT.some(keyword =>
      prompt.toLowerCase().includes(keyword) || 
      context?.toLowerCase().includes(keyword)
    );
    
    let documentContext = '';
    let sourceType = 'external';
    let behaviorPolicy = '';
    let intentPromptLogic = '';
    let detectedSourceDocuments: string[] = [];
    let knowledgeTier = 'external';
    
    // Determine appropriate knowledge tier
    if (requiresInternalSecure) {
      knowledgeTier = 'internal_secure';
    } else if (isExternalAwarenessContext) {
      knowledgeTier = 'external_awareness';
    } else if (isOrganizationalContext) {
      knowledgeTier = 'organizational_context';
    }
    
    // For Tier 1 (Internal Secure) contexts, enforce strict policy
    if (requiresInternalSecure && organizationId) {
      console.log('🔒 INTERNAL MODE: Enforcing AI Behavior & Knowledge Source Policy');
      
      // Get the policy documents first
      behaviorPolicy = await getAIBehaviorPolicy(organizationId);
      intentPromptLogic = await getIntentPromptLogic(organizationId);
      
      // Get document context for the specific request
      documentContext = await getDocumentContext(organizationId, prompt, currentDomain);
      sourceType = 'internal';
      
      console.log(`Knowledge base context length: ${documentContext.length} characters`);
      console.log(`AI Behavior Policy found: ${behaviorPolicy.length > 0 ? 'Yes' : 'No'}`);
      console.log(`Intent Prompt Logic found: ${intentPromptLogic.length > 0 ? 'Yes' : 'No'}`);
      
      // Middleware validation: Check if we have sufficient internal documentation
      if (documentContext.length === 0) {
        console.warn('⚠️ POLICY WARNING: Limited internal documentation found for audit/maturity context');
        console.log('Proceeding with limited context but will note the policy constraint in response');
        // Instead of blocking, we'll proceed but note the policy issue in the response
        // This allows the system to work while encouraging users to upload proper documentation
      }
    }
    
    // For Tier 3 (External Awareness) contexts, get relevant threat intelligence
    let externalInsightsContext = '';
    if (isExternalAwarenessContext && organizationId) {
      console.log('🌐 EXTERNAL AWARENESS MODE: Fetching threat intelligence');
      externalInsightsContext = await getExternalInsights(organizationId, context);
    }
    
    
    
    const systemPrompt = `You are Maturion, the operational maturity specialist. Your mission is "Powering Assurance. Elevating Performance." You are part of APGI (Assurance Protection Group Inc.) and help organizations navigate their maturity journey from reactive to resilient.

CRITICAL DOMAIN-MPS MAPPING RULES:
- Leadership & Governance: MPS 1-5 ONLY
- Process Integrity: MPS 6-10 ONLY  
- People & Culture: MPS 11-14 ONLY
- Protection: MPS 15-20 ONLY
- Proof it Works: MPS 21-25 ONLY

${behaviorPolicy ? `
=== AI BEHAVIOR & KNOWLEDGE SOURCE POLICY (MANDATORY ENFORCEMENT) ===
${behaviorPolicy}

POLICY ENFORCEMENT ACTIVE: All responses must comply with the above policy requirements.
` : ''}

${intentPromptLogic ? `
=== ENHANCED INTENT GENERATION LOGIC ===
${intentPromptLogic}

Apply this reasoning structure for all intent statement generation.
` : ''}

KNOWLEDGE TIER: ${knowledgeTier.toUpperCase().replace('_', ' ')}

CRITICAL BEHAVIOR RULES:
${requiresInternalSecure ? `
🔒 TIER 1: INTERNAL SECURE MODE - AI Behavior & Knowledge Source Policy v2.0 ENFORCED
- You MUST STRICTLY use ONLY information from the provided internal documents below
- NO external LLM knowledge permitted - all content must be grounded in uploaded documentation
- For MPS generation: Extract EXACTLY ALL MPS titles, numbers, and information as listed in the uploaded documents
- For Intent generation: Follow the Enhanced Intent Logic above and synthesize specific intent statements based on document content
- AVOID BOILERPLATE: No generic phrases like "ensure compliance and effective governance" unless explicitly in source documents
- DOMAIN-SPECIFIC RISKS: Intent must reflect actual domain risks, mechanisms, and strategic objectives from internal sources
- STRICT DOMAIN FILTERING: Extract only MPSs within correct number ranges for "${currentDomain}"
- TRACEABILITY: Reference specific source documents (e.g., "From [Document Name]:")
- SOURCE VALIDATION: Only use content explicitly found in internal documentation

RUNTIME DETECTION REQUIREMENT: Begin responses with appropriate source indicator:
${documentContext ? `✅ "Internal evidence source found: [filename]"` : `⚠️ "External insight used. Please validate before applying."`}

${documentContext ? `
INTERNAL DOCUMENT CONTEXT (AUTHORITATIVE SOURCE - USE ONLY THIS):
${documentContext}

COMPLIANCE REQUIREMENT: Base ALL responses strictly on the internal documents above. Document references are MANDATORY for audit trail.
` : `
⚠️ LIMITED INTERNAL DOCUMENTATION AVAILABLE
For this ${currentDomain || 'domain'} request, I have limited internal documentation. I will proceed with available knowledge while noting this policy constraint.

POLICY RECOMMENDATION: Please upload relevant documents to your AI Knowledge Base:
- ${currentDomain || 'Domain'} MPS documentation (Annex 1 or MPS lists)
- Domain-specific audit criteria and standards
- Organizational frameworks and policies

I will generate the requested content using available context and industry best practices, but optimal results require proper internal documentation.
`}
` : isExternalAwarenessContext ? `
🌐 TIER 3: EXTERNAL AWARENESS MODE - AI Behavior & Knowledge Source Policy v2.0
- You may use real-time external sources for: threat detection, risk horizon scanning, industry-specific situational awareness
- ALL external content must be tagged as "ADVISORY ONLY" and NOT used for maturity scoring or evidence decisions
- ALWAYS begin responses with: ⚠️ "External insight used. Please validate before applying."
- Tag all externally sourced intelligence as "External Insight"

${externalInsightsContext ? `
CURRENT THREAT INTELLIGENCE:
${externalInsightsContext}
` : 'No recent threat intelligence available for your organizational profile.'}
- Do NOT mix external sources with scoring/evidence workflows
` : isOrganizationalContext ? `
🏢 TIER 2: ORGANIZATIONAL CONTEXT MODE - AI Behavior & Knowledge Source Policy v2.0
- Draw from onboarding data and uploaded organizational metadata
- Tailor criteria to user context (org size, structure, risk roles)
- Begin responses with: ✅ "Using organizational context for tailored recommendations"
- Combine internal documentation with organizational specifics when available
` : `
🌐 GENERAL ADVISORY MODE - AI Behavior & Knowledge Source Policy v2.0
- External context permitted for general guidance
- Clearly label external insights as "Based on industry best practices"
- Prioritize internal documentation when available
- Begin responses with: ℹ️ "General guidance mode - recommend uploading specific documentation for audit contexts"
${allowExternalContext && documentContext ? `
INTERNAL DOCUMENT CONTEXT:
${documentContext}
` : ''}
`}

Your core expertise includes:
- Leadership & Governance maturity
- Process Integrity optimization  
- People & Culture development
- Protection strategies and implementation
- Proof of effectiveness validation

When providing guidance:
- Be concise and actionable
- Focus on practical steps for improvement
- Reference the 5 maturity levels: Basic → Reactive → Compliant → Proactive → Resilient
- Provide specific recommendations based on the user's current domain context
- Always consider risk-based decision making
- Emphasize integrated approaches over siloed solutions

Current context: ${context || 'General maturity assessment guidance'}
Domain focus: ${currentDomain || 'Cross-domain maturity'} 
Source mode: ${sourceType}

Respond in a helpful, professional tone that builds confidence while being realistic about improvement timelines.`;

    console.log('Making OpenAI API call with model: gpt-4.1-2025-04-14');
    console.log('System prompt length:', systemPrompt.length);
    console.log('User prompt length:', prompt.length);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    console.log('OpenAI API response status:', response.status);
    console.log('OpenAI API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response data structure:', Object.keys(data));
    
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('OpenAI API returned invalid response structure - no choices array');
    }

    if (!data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenAI choice structure:', data.choices[0]);
      throw new Error('OpenAI API returned invalid choice structure - no message content');
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI response length:', aiResponse.length);
    console.log('AI response preview:', aiResponse.substring(0, 200));

    return new Response(JSON.stringify({ 
      content: aiResponse,
      success: true,
      sourceType: sourceType,
      knowledgeTier: knowledgeTier,
      requiresInternalSecure: requiresInternalSecure,
      isExternalAwarenessContext: isExternalAwarenessContext,
      isOrganizationalContext: isOrganizationalContext,
      hasDocumentContext: documentContext.length > 0,
      documentContextLength: documentContext.length,
      knowledgeBaseEnforced: requiresInternalSecure && documentContext.length > 0,
      sourceDocuments: detectedSourceDocuments
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in maturion-ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});