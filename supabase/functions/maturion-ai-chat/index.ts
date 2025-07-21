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
    // This would ideally use vector similarity search, but for now we'll use basic filtering
    const { data: chunks, error } = await supabase
      .from('ai_document_chunks')
      .select('content, metadata')
      .eq('organization_id', organizationId)
      .limit(5);
    
    if (error || !chunks) {
      return '';
    }
    
    return chunks.map(chunk => chunk.content).join('\n\n');
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
- DO NOT use external knowledge, industry trends, or general best practices
- If the internal documents don't contain sufficient information, clearly state this limitation
- All MPS generation, intent creation, criteria development, and maturity assessments must be based solely on approved internal documentation
- Never substitute or hallucinate content not found in the provided documents

INTERNAL DOCUMENT CONTEXT:
${documentContext}

If no relevant internal documents are available, respond with: "I don't have sufficient internal documentation to provide this information. Please ensure relevant documents are uploaded to your knowledge base."
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