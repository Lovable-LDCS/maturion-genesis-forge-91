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

// Core audit-related contexts that must use internal documents only
const INTERNAL_ONLY_CONTEXTS = [
  'MPS generation',
  'Intent statement generation', 
  'Criteria development',
  'Audit structure',
  'Maturity level assessment',
  'Compliance scoring',
  'Roadmap progression'
];

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

    // Determine if this is an internal-only context
    const isInternalOnlyContext = INTERNAL_ONLY_CONTEXTS.some(internalContext => 
      context?.toLowerCase().includes(internalContext.toLowerCase())
    );
    
    let documentContext = '';
    let sourceType = 'external';
    
    // For internal contexts, fetch and use only internal documents with enhanced search
    if (isInternalOnlyContext && organizationId) {
      documentContext = await getDocumentContext(organizationId, prompt, currentDomain);
      sourceType = 'internal';
      console.log(`Knowledge base context length: ${documentContext.length} characters`);
    }
    
    
    const systemPrompt = `You are Maturion, an AI assistant specializing in operational maturity assessment and security governance. Your mission is "Powering Assurance. Elevating Performance." You are part of APGI (Assurance Protection Group Inc.) and help organizations navigate their maturity journey.

CRITICAL DOMAIN-MPS MAPPING RULES:
- Leadership & Governance: MPS 1-5 ONLY
- Process Integrity: MPS 6-10 ONLY  
- People & Culture: MPS 11-14 ONLY
- Protection: MPS 15-20 ONLY
- Proof it Works: MPS 21-25 ONLY

CRITICAL BEHAVIOR RULES:
${isInternalOnlyContext ? `
🔒 INTERNAL MODE ACTIVE - This is a core audit/maturity context.
- You MUST STRICTLY use ONLY information from the provided internal documents below
- For MPS generation: Extract EXACTLY ALL MPS titles, numbers, and information as listed in the uploaded documents
- For Intent generation: SYNTHESIZE intent statements based on document content, using format: "This MPS aims to ensure [purpose] by [method], as outlined in [document context]"
- STRICT DOMAIN FILTERING: If generating MPSs for "${currentDomain}", only extract MPSs that belong to this domain based on the MPS number ranges above
- For Leadership & Governance: ONLY extract MPS 1, 2, 3, 4, 5 - EXCLUDE any MPS 13, 14, 15, etc.
- For Process Integrity: ONLY extract MPS 6, 7, 8, 9, 10 - EXCLUDE any MPS outside this range
- Never include MPSs from other domains even if they appear in the context
- If you see MPS 13 or 14 in Leadership & Governance context, EXCLUDE them (they belong to People & Culture)
- All responses must cite the specific document sources (e.g., "From [Document Name]:")
- For intent generation: Use available document context to create actionable intent statements even if explicit intents aren't provided

${documentContext ? `
INTERNAL DOCUMENT CONTEXT (USE ONLY THIS CONTENT):
${documentContext}

IMPORTANT: Base your response STRICTLY on the internal documents above. For intent generation, synthesize based on document content. Filter by domain MPS numbers. Do not add external knowledge or assumptions.
` : `
⚠️ LIMITED INTERNAL DOCUMENTATION AVAILABLE
I have limited internal documentation for this ${currentDomain || 'domain'} request. I will use available context to provide the best guidance possible.

For optimal results, please ensure relevant documents are uploaded to your AI Knowledge Base:
- MPS lists or Annex documents for ${currentDomain || 'this domain'}
- Domain-specific audit criteria
- Organizational standards and requirements
`}
` : `
🌐 ADVISORY MODE ACTIVE - External context permitted.
- You may use both internal documentation (if provided) and external knowledge
- Clearly label external insights as "Based on industry best practices" or "External context"
- Prioritize internal documentation when available, but supplement with external knowledge as helpful
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

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true,
      sourceType: sourceType,
      isInternalOnlyContext: isInternalOnlyContext,
      hasDocumentContext: documentContext.length > 0,
      documentContextLength: documentContext.length,
      knowledgeBaseEnforced: isInternalOnlyContext && documentContext.length > 0
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