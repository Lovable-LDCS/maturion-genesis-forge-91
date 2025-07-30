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
    
    // Get document chunks for this MPS
    const { data: chunks, error: chunksError } = await supabase
      .from('ai_document_chunks')
      .select('content')
      .eq('organization_id', organizationId)
      .ilike('content', `%MPS ${mpsNumber}%`)
      .limit(10);
    
    if (chunksError) {
      throw new Error(`Failed to fetch document chunks: ${chunksError.message}`);
    }
    
    if (!chunks || chunks.length === 0) {
      throw new Error(`No document chunks found for MPS ${mpsNumber}`);
    }
    
    console.log(`📄 Found ${chunks.length} document chunks for MPS ${mpsNumber}`);
    
    // Prepare context for AI
    const documentContext = chunks.map(chunk => chunk.content).join('\n\n');
    
    // Generate criteria using OpenAI
    const prompt = `Based on the following MPS document content, generate 3-5 specific, measurable assessment criteria for "${mpsName}".

Document Content:
${documentContext}

Generate criteria in this exact JSON format:
{
  "criteria": [
    {
      "statement": "Clear, specific assessment criterion",
      "summary": "Brief explanation of what this criterion measures"
    }
  ]
}

Make each criterion:
- Specific and measurable
- Directly related to the MPS content
- Actionable for security assessments
- Focused on practical implementation`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a security assessment expert. Generate practical, specific criteria for maturity assessments.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log(`🤖 Generated AI content for MPS ${mpsNumber}`);
    
    // Parse AI response
    let criteriaData;
    try {
      criteriaData = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response, using fallback criteria');
      criteriaData = {
        criteria: [
          {
            statement: `Assessment criterion for ${mpsName} implementation`,
            summary: `Evaluate the organization's compliance with ${mpsName} requirements`
          }
        ]
      };
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