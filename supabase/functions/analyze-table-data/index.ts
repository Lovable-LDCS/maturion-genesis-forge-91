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
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Create admin client for authentication check
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const userSupabase = createClient(supabaseUrl, supabaseAnon);

    // Get and validate auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization header required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await userSupabase.auth.getUser(token);
    
    if (authError || !user.user) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired token'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Check if user is admin using the secure function
    const { data: isAdmin, error: adminError } = await adminSupabase.rpc('is_user_admin', {
      user_uuid: user.user.id
    });

    if (adminError || !isAdmin) {
      // Log security violation
      await adminSupabase.from('audit_trail').insert({
        organization_id: '00000000-0000-0000-0000-000000000000',
        table_name: 'security_violations',
        record_id: user.user.id,
        action: 'UNAUTHORIZED_TABLE_ANALYSIS_ATTEMPT',
        changed_by: user.user.id,
        change_reason: 'Non-admin user attempted to access analyze-table-data function'
      });
      
      return new Response(JSON.stringify({
        error: 'Admin privileges required for table data analysis'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    const supabase = adminSupabase;

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

    // Helper function to determine table purpose
    const getTablePurpose = (tableName: string) => {
      const purposeMap: { [key: string]: string } = {
        'adaptive_learning_metrics': 'learning performance metrics, improvement trends, and educational analytics over time',
        'ai_behavior_monitoring': 'AI system behavior patterns and anomaly detection',
        'assessment_scores': 'assessment results and evaluation metrics',
        'audit_trail': 'system activity logs and change tracking',
        'organization_documents': 'document management and processing status',
        'criteria': 'evaluation criteria and assessment standards',
        'milestones': 'project milestones and achievement tracking'
      };
      
      return purposeMap[tableName] || `${tableName.replace(/_/g, ' ')} data and related metrics`;
    };

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

    // Handle empty table case with intelligent response
    if (recordCount === 0) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: `I can see that the "${tableName}" table exists in your database, but no data has been captured yet.`,
          data: analysisData,
          recommendation: `This table is designed to track ${getTablePurpose(tableName)}. Here's how I can assist you:

• **Get Started**: I can help you understand what data should be collected for this table
• **Data Structure**: The table has ${schemaData?.length || 0} columns ready for data: ${schemaData?.map(c => c.column_name).join(', ')}
• **Next Steps**: Would you like me to explain what each field is for, or help you set up data collection processes?
• **Analysis Ready**: Once you have data, I can provide detailed insights, trends, and recommendations

What specific aspect would you like help with regarding your ${tableName.replace(/_/g, ' ')} data?`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no OpenAI key, return structured data for manual analysis
    if (!openaiApiKey) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: `Table "${tableName}" contains ${recordCount} records with ${schemaData?.length || 0} columns.`,
          data: analysisData,
          recommendation: 'Data is available for analysis. AI analysis requires OpenAI API key configuration.'
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
        max_tokens: 1000
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      
      // Provide intelligent fallback response for API issues
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: recordCount === 0 ? 
            `I can see that the "${tableName}" table exists but contains no data yet.` :
            `I found ${recordCount} records in the "${tableName}" table, but I'm currently unable to provide AI-powered insights due to a configuration issue.`,
          data: analysisData,
          recommendation: recordCount === 0 ? 
            `This table is designed to track ${getTablePurpose(tableName)}. Here's how I can help:

• **Understanding the Structure**: The table has ${schemaData?.length || 0} columns: ${schemaData?.map(c => c.column_name).join(', ')}
• **Data Collection**: I can guide you on what data to collect and how to populate this table
• **Setup Assistance**: Would you like help understanding what each field represents?
• **Future Analysis**: Once data is available and the system is configured, I can provide detailed trend analysis

What would you like to know about setting up your ${tableName.replace(/_/g, ' ')} tracking?` :
            `I can see your data but need system configuration to provide AI analysis. In the meantime:

• **Data Overview**: Found ${recordCount} records with ${schemaData?.length || 0} columns
• **Manual Review**: You can examine the data structure and recent entries
• **Basic Patterns**: Look for trends in date fields: ${dateFields.join(', ') || 'none detected'}
• **Numeric Tracking**: Monitor these numeric fields: ${numericFields.join(', ') || 'none detected'}

Would you like me to help with data interpretation or system setup?`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    
    // Provide intelligent error response instead of technical error
    return new Response(JSON.stringify({
      success: true,
      analysis: {
        summary: `I encountered an issue while analyzing the "${tableName || 'requested'}" table, but I'm here to help in other ways.`,
        data: null,
        recommendation: `Here's how I can assist you:

• **Table Verification**: Let me help verify the table exists and is accessible
• **Permission Check**: I can guide you through checking database permissions
• **Alternative Analysis**: I can help you understand your data structure manually
• **Troubleshooting**: We can work together to resolve any configuration issues

**Common Solutions:**
- Verify the table name is spelled correctly
- Check that you have the necessary permissions to access this data
- Ensure your database connection is working properly

What specific aspect of your data analysis would you like help with? I'm here to guide you through the process.`
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});