import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mpsId, mpsNumber, mpsName, organizationId } = await req.json();
    
    console.log(`🤖 Generating and saving criteria for MPS ${mpsNumber}: ${mpsName}`);
    
    // Create Supabase client with service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get document chunks for this MPS using both direct and search methods
    let chunks = [];
    let chunksError = null;
    
    // Method 1: Direct database query (primary method)
    const { data: directChunks, error: directError } = await supabase
      .from('ai_document_chunks')
      .select('content, ai_documents!inner(title, document_type)')
      .eq('organization_id', organizationId)
      .eq('ai_documents.document_type', 'mps_document')
      .ilike('content', `%MPS ${mpsNumber}%`)
      .limit(10);
    
    if (!directError && directChunks && directChunks.length > 0) {
      chunks = directChunks;
      console.log(`📄 Found ${chunks.length} document chunks using direct query for MPS ${mpsNumber}`);
    } else {
      // Method 2: Fallback to search function
      console.log(`⚠️ Direct query found no chunks, trying search function for MPS ${mpsNumber}`);
      try {
        const { data: searchResult, error: searchError } = await supabase.functions.invoke('search-ai-context', {
          body: {
            query: `MPS ${mpsNumber}`,
            organizationId: organizationId,
            documentTypes: ['mps', 'standard'],
            threshold: 0.3,
            limit: 10
          }
        });
        
        if (!searchError && searchResult?.results?.length > 0) {
          chunks = searchResult.results.map(r => ({
            content: r.content,
            ai_documents: { title: r.document_name, document_type: r.document_type }
          }));
          console.log(`📄 Found ${chunks.length} document chunks using search function for MPS ${mpsNumber}`);
        } else {
          chunksError = directError || new Error('No chunks found via either method');
        }
      } catch (searchErr) {
        chunksError = searchErr;
      }
    }
    
    if (chunksError) {
      throw new Error(`Failed to fetch document chunks: ${chunksError.message}`);
    }
    
    if (!chunks || chunks.length === 0) {
      throw new Error(`No document chunks found for MPS ${mpsNumber}`);
    }
    
    console.log(`📄 Found ${chunks.length} document chunks for MPS ${mpsNumber}`);
    
    // CRITICAL: Apply token limiting to document context
    const MAX_DOCUMENT_TOKENS = 6000;
    const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
    const truncateToTokens = (text: string, maxTokens: number): string => {
      const maxChars = maxTokens * 4;
      if (text.length <= maxChars) return text;
      return text.substring(0, maxChars) + '\n...[TRUNCATED DUE TO TOKEN LIMIT]';
    };
    
    // Prepare context for AI with token limiting
    const rawDocumentContext = chunks.map(chunk => chunk.content).slice(0, 5).join('\n\n'); // Limit to top 5 chunks
    const documentContext = truncateToTokens(rawDocumentContext, MAX_DOCUMENT_TOKENS);
    
    console.log(`🔢 Document context: ${documentContext.length} chars, ~${estimateTokens(documentContext)} tokens`);
    
    // Generate criteria using OpenAI with improved prompt and token management
    const basePrompt = `You are a security assessment expert. Based on the following MPS document content, generate 8-12 specific, measurable assessment criteria for "${mpsName}".

EVIDENCE-FIRST FORMAT (MANDATORY):
Every criterion MUST start with evidence type:
- "A documented [specific_document_type] that [specific_action] the [specific_requirement] for ${mpsName.toLowerCase()}."

Examples:
- "A formal governance charter that defines the board structure and oversight responsibilities."
- "A documented strategic plan that outlines organizational direction and priorities."

ACTUAL MPS DOCUMENT CONTENT:
${documentContext}

STRICT REQUIREMENTS:
- NO placeholder text like "Assessment criterion" or "Criterion A/B/C"
- NO generic phrases like "ensure compliance" or "establish and maintain"
- Use ONLY content from the provided MPS document above
- Each criterion must be specific and measurable
- Focus on practical implementation evidence

Respond with ONLY valid JSON in this exact format:
{
  "criteria": [
    {
      "statement": "A documented [specific type] that [specific action] the [specific requirement] for ${mpsName.toLowerCase()}.",
      "summary": "Brief explanation of what this criterion measures and why it matters"
    }
  ]
}`;

    
    // CRITICAL: Apply final cleanup to remove placeholder patterns
    const cleanupPrompt = (prompt: string): string => {
      console.log('🧹 Starting final prompt cleanup...');
      
      let cleaned = prompt;
      const placeholderPatterns = [
        /\[document_type\]/gi,
        /\[action_verb\]/gi,
        /\[requirement\]/gi,
        /\[specific_[a-z_]+\]/gi,
        /\bCriterion\s+[A-Z](?=\s*$|\s*\.|\s*,)/gi,
        /\bCriterion\s+[0-9]+(?=\s*$|\s*\.|\s*,)/gi,
        /\bAssessment criterion\b/gi,
        /\bTBD\b/gi,
        /\bTODO\b/gi
      ];
      
      placeholderPatterns.forEach((pattern, index) => {
        const matches = cleaned.match(pattern);
        if (matches) {
          console.log(`🔍 Found ${matches.length} matches for pattern ${index + 1}: ${pattern.source}`);
          cleaned = cleaned.replace(pattern, '[PLACEHOLDER_REMOVED]');
        }
      });
      
      cleaned = cleaned.replace(/(\[PLACEHOLDER_REMOVED\]\s*){2,}/g, '[PLACEHOLDER_REMOVED]');
      cleaned = cleaned.replace(/\[PLACEHOLDER_REMOVED\]/g, '');
      
      return cleaned.trim();
    };
    
    const finalPrompt = cleanupPrompt(basePrompt);
    const finalTokens = estimateTokens(finalPrompt);
    
    console.log(`🔢 FINAL PROMPT METRICS:`);
    console.log(`   Total length: ${finalPrompt.length} characters`);
    console.log(`   Estimated tokens: ${finalTokens}`);
    console.log(`   Within 12K limit: ${finalTokens <= 12000 ? '✅' : '❌'}`);
    
    if (finalTokens > 12000) {
      console.error(`❌ Token limit exceeded: ${finalTokens} > 12000`);
      throw new Error(`Prompt exceeds token limit: ${finalTokens} tokens`);
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        instructions: 'You are a security assessment expert. Generate practical, specific criteria for maturity assessments using evidence-first format.',
        input: finalPrompt,
        max_completion_tokens: 2000,
        store: false // For compliance and data retention
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.output_text;
    
    console.log(`🤖 Generated AI content for MPS ${mpsNumber}`);
    
    // Parse AI response with improved error handling
    let criteriaData;
    try {
      // Clean the AI response to remove any markdown or extra text
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      criteriaData = JSON.parse(cleanedContent);
      
      // Validate the structure
      if (!criteriaData.criteria || !Array.isArray(criteriaData.criteria)) {
        throw new Error('Invalid criteria structure');
      }
      
      console.log(`✅ Successfully parsed AI response with ${criteriaData.criteria.length} criteria`);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI response:', aiContent);
      
      // Use fallback criteria only as last resort but avoid placeholder patterns
      criteriaData = {
        criteria: [
          {
            statement: `A documented implementation assessment that evaluates the organization's ${mpsName.toLowerCase()} standards and procedures.`,
            summary: `Assess the organization's compliance with ${mpsName} requirements and implementation standards`
          }
        ]
      };
      console.log('Using fallback criteria due to parsing failure (placeholder-free)');
    }
    
    // Save criteria to database
    const savedCriteria = [];
    let criteriaCounter = 1;
    
    for (const criterion of criteriaData.criteria) {
      const { data: savedCriterion, error: saveError } = await supabase
        .from('criteria')
        .insert({
          mps_id: mpsId,
          organization_id: organizationId,
          criteria_number: `${mpsNumber}.${criteriaCounter}`,
          statement: criterion.statement,
          summary: criterion.summary,
          status: 'not_started',
          created_by: '00000000-0000-0000-0000-000000000000', // System user
          updated_by: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();
      
      if (saveError) {
        console.error(`Error saving criterion ${criteriaCounter}:`, saveError);
      } else {
        savedCriteria.push(savedCriterion);
        console.log(`💾 Saved criterion ${mpsNumber}.${criteriaCounter}`);
      }
      
      criteriaCounter++;
    }
    
    console.log(`✅ Successfully saved ${savedCriteria.length} criteria for MPS ${mpsNumber}`);
    
    return new Response(JSON.stringify({
      success: true,
      mpsNumber,
      mpsName,
      criteriaGenerated: savedCriteria.length,
      criteria: savedCriteria
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-and-save-criteria function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});