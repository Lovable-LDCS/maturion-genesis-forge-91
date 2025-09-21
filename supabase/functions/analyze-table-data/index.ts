import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tableName, query, organizationId } = await req.json();

    if (!tableName || !query) {
      return new Response(JSON.stringify({ 
        error: 'Table name and query are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Analyzing table: ${tableName} for org: ${organizationId}`);

    // Get table schema information
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');

    if (schemaError) {
      console.error('Schema error:', schemaError);
      return new Response(JSON.stringify({ 
        error: 'Failed to get table schema',
        details: schemaError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query table data with organization filter if applicable
    let tableQuery = supabase.from(tableName).select('*');
    
    // Apply organization filter if the table has organization_id column
    const hasOrgColumn = schemaData?.some(col => col.column_name === 'organization_id');
    if (hasOrgColumn && organizationId) {
      tableQuery = tableQuery.eq('organization_id', organizationId);
    }

    // Limit to recent data for performance
    tableQuery = tableQuery.order('created_at', { ascending: false }).limit(100);

    const { data: tableData, error: dataError } = await tableQuery;

    if (dataError) {
      console.error('Data query error:', dataError);
      return new Response(JSON.stringify({ 
        error: 'Failed to query table data',
        details: dataError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recordCount = tableData?.length || 0;
    console.log(`📊 Retrieved ${recordCount} records from ${tableName}`);

    // Analyze data structure and patterns
    const analysisData = {
      tableName,
      schema: schemaData,
      recordCount,
      hasData: recordCount > 0,
      sample: tableData?.slice(0, 5), // First 5 records for analysis
      dateFields: schemaData?.filter(col => 
        col.data_type.includes('timestamp') || col.data_type.includes('date')
      ).map(col => col.column_name) || [],
      numericFields: schemaData?.filter(col => 
        col.data_type.includes('numeric') || col.data_type.includes('integer') || col.data_type.includes('real')
      ).map(col => col.column_name) || [],
    };

    // If no OpenAI key, return structured data for manual analysis
    if (!openaiApiKey) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: `Table "${tableName}" contains ${recordCount} records with ${schemaData?.length || 0} columns.`,
          data: analysisData,
          recommendation: recordCount === 0 ? 
            'No data found in this table. Consider adding records to perform meaningful analysis.' :
            'Data is available for analysis. AI analysis requires OpenAI API key configuration.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate AI-powered analysis
    const aiPrompt = `Analyze this database table data and provide insights:

Table: ${tableName}
Records: ${recordCount}
Schema: ${JSON.stringify(schemaData, null, 2)}

Sample Data (first 5 records):
${JSON.stringify(tableData?.slice(0, 5), null, 2)}

User Question: ${query}

Please provide:
1. A summary of what this table contains
2. Key patterns or trends you observe in the data
3. Any anomalies or interesting findings
4. Recommendations for improvements or actions based on the data
5. Specific insights that answer the user's question

Be specific and reference actual data values where relevant. If there's no data, explain what the table is designed to track and suggest next steps.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst expert. Provide clear, actionable insights based on database table analysis. Focus on trends, patterns, and practical recommendations.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiData = await openAIResponse.json();
    const analysis = aiData.choices[0].message.content;

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        summary: analysis,
        data: analysisData,
        queryMetadata: {
          tableName,
          recordCount,
          columnsAnalyzed: schemaData?.length || 0,
          hasOrganizationFilter: hasOrgColumn,
          timestamp: new Date().toISOString()
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-table-data function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});