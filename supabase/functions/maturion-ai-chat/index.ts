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

// Function to get relevant document chunks for AI context
async function getDocumentContext(organizationId: string, query: string) {
  try {
    console.log('Fetching document context for organization:', organizationId);
    
    // Get all document chunks that contain MPS information
    const { data: chunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, metadata, ai_documents!inner(title, domain)')
      .eq('organization_id', organizationId)
      .ilike('content', '%MPS%')
      .limit(20);
    
    if (error) {
      console.error('Error fetching document chunks:', error);
      return '';
    }
    
    if (!chunks || chunks.length === 0) {
      console.log('No MPS-related document chunks found for organization:', organizationId);
      return '';
    }
    
    console.log(`Found ${chunks.length} relevant document chunks`);
    
    // Prioritize chunks that contain structured MPS lists (like Annex 1)
    const structuredChunks = chunks.filter(chunk => 
      chunk.content.includes('Annex 1') || 
      chunk.content.includes('MPS 1') ||
      chunk.content.includes('Leadership and Governance') ||
      chunk.content.includes('Process Integrity') ||
      chunk.content.match(/MPS\s+\d+.*?-/)
    );
    
    const relevantChunks = structuredChunks.length > 0 ? structuredChunks : chunks;
    
    return relevantChunks.map(chunk => chunk.content).join('\n\n');
  } catch (error) {
    console.error('Error getting document context:', error);
    return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context, currentDomain, organizationId, allowExternalContext = false } = await req.json();

    // Determine if this is an internal-only context
    const isInternalOnlyContext = INTERNAL_ONLY_CONTEXTS.some(internalContext => 
      context?.toLowerCase().includes(internalContext.toLowerCase())
    );
    
    let documentContext = '';
    let sourceType = 'external';
    
    // For internal contexts, fetch and use only internal documents
    if (isInternalOnlyContext && organizationId) {
      documentContext = await getDocumentContext(organizationId, prompt);
      sourceType = 'internal';
    }
    
    const systemPrompt = `You are Maturion, an AI assistant specializing in operational maturity assessment and security governance. Your mission is "Powering Assurance. Elevating Performance." You are part of APGI (Assurance Protection Group Inc.) and help organizations navigate their maturity journey.

CRITICAL BEHAVIOR RULES:
${isInternalOnlyContext ? `
🔒 INTERNAL MODE ACTIVE - This is a core audit/maturity context.
- You MUST ONLY use information from the provided internal documents below
- DO NOT generate, create, or hallucinate any MPS content
- Extract EXACTLY the MPS titles and information as listed in the uploaded documents
- For MPS generation: Use ONLY the exact MPS list from Annex 1 in the internal documents
- If asked to generate MPSs for a domain, find the exact MPSs for that domain from the internal documentation
- Never substitute or modify the approved MPS titles and descriptions
- All responses must reference the specific document sections (e.g., "From Annex 1:")

INTERNAL DOCUMENT CONTEXT:
${documentContext}

${documentContext ? `Based on the internal documents above, provide responses using ONLY this approved content.` : `I don't have sufficient internal documentation to provide this information. Please ensure relevant documents are uploaded to your knowledge base.`}
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
      hasDocumentContext: documentContext.length > 0
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