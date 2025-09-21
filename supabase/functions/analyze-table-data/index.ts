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

    // Verify table exists using safe RPC (no raw SQL / system schemas)
    const { data: tables, error: tablesError } = await supabase.rpc('list_public_tables');
    if (tablesError) {
      console.error('Tables listing error:', tablesError);
      return new Response(JSON.stringify({ 
        error: 'Failed to list tables',
        details: tablesError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tableExists = (tables || []).some((t: any) => (t.table_name || t).toString() === tableName);
    if (!tableExists) {
      return new Response(JSON.stringify({ 
        error: `Table not found: ${tableName}`
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build base query and prefer last 6 months if date columns exist
    let tableQuery = supabase.from(tableName).select('*');

    // Temporary light query to infer columns from a single row
    const { data: oneRow } = await supabase.from(tableName).select('*').limit(1).maybeSingle();
    const inferredColumns = oneRow ? Object.keys(oneRow) : [];

    // Organization filter when applicable
    const hasOrgColumn = inferredColumns.includes('organization_id');
    if (hasOrgColumn && organizationId) {
      tableQuery = tableQuery.eq('organization_id', organizationId);
    }

    // Date window (last 6 months) if we have common date columns
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsIso = sixMonthsAgo.toISOString();
    const datePriority = ['measurement_period_start', 'measurement_period_end', 'created_at', 'updated_at'];
    const dateCol = datePriority.find(c => inferredColumns.includes(c));
    if (dateCol) {
      tableQuery = tableQuery.gte(dateCol, sixMonthsIso);
    }

    // Order by best available timestamp to keep analysis consistent
    if (dateCol) {
      tableQuery = tableQuery.order(dateCol, { ascending: false });
    } else if (inferredColumns.includes('created_at')) {
      tableQuery = tableQuery.order('created_at', { ascending: false });
    }

    // Reasonable limit for analysis
    tableQuery = tableQuery.limit(500);

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

    // Infer schema from data (column names and basic JS types)
    const sample = tableData?.[0] || oneRow || {};
    const schemaData = Object.keys(sample).map((key) => {
      const v = (sample as any)[key];
      const jsType = Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v);
      return { column_name: key, data_type: jsType, is_nullable: v === null ? 'YES' : 'UNKNOWN' };
    });

    // Analyze data structure and patterns
    const dateFieldHeuristics = (col: string) => {
      const lc = col.toLowerCase();
      return lc.includes('date') || lc.includes('time') || lc.endsWith('_at') || lc === 'measurement_period_start' || lc === 'measurement_period_end';
    };

    const numericHeuristics = (val: any) => {
      if (typeof val === 'number') return true;
      if (typeof val === 'string') return !isNaN(parseFloat(val)) && isFinite(parseFloat(val));
      return false;
    };

    const dateFields = schemaData.map(c => c.column_name).filter(dateFieldHeuristics);
    const numericFields = Object.keys(sample).filter(k => numericHeuristics((sample as any)[k]));

    const analysisData = {
      tableName,
      schema: schemaData,
      recordCount,
      hasData: recordCount > 0,
      sample: tableData?.slice(0, 5),
      dateFields,
      numericFields,
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

    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        instructions: 'You are a data analyst expert. Provide clear, actionable insights based on database table analysis. Focus on trends, patterns, and practical recommendations.',
        input: aiPrompt,
        max_completion_tokens: 1000,
        store: false // For compliance and data retention
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const aiData = await openAIResponse.json();
    const analysis = aiData.output_text;

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