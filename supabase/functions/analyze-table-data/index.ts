import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        success: true,
        analysis: {
          summary: 'Authentication required to analyze table data.',
          data: null,
          recommendation: 'Please log in to access table analysis features.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await userSupabase.auth.getUser(token);
    
    if (authError || !user.user) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: 'Unable to verify user authentication.',
          data: null,
          recommendation: 'Please log in again to access table analysis features.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let tableName: string, query: string, organizationId: string;
    
    try {
      const body = await req.json();
      tableName = body.tableName;
      query = body.query;
      organizationId = body.organizationId;
    } catch (parseError) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: 'I encountered an issue processing your request.',
          data: null,
          recommendation: 'Please try rephrasing your table analysis request with the table name and what you\'d like to know about the data.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tableName || !query) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: 'I need more information to analyze your data.',
          data: null,
          recommendation: 'Please specify which table you\'d like me to analyze and what specific insights you\'re looking for.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Analyzing table: ${tableName} for org: ${organizationId}`);

    // Check if user has admin access
    const { data: isAdmin, error: adminError } = await adminSupabase.rpc('is_user_admin', {
      user_uuid: user.user.id
    });

    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: 'Admin privileges are required for table data analysis.',
          data: null,
          recommendation: 'Please contact your administrator to request access to database analysis features.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = adminSupabase;

    // Verify table exists using safe RPC
    let tables: any[] = [];
    try {
      const { data: tablesData, error: tablesError } = await supabase.rpc('list_public_tables');
      if (!tablesError && tablesData) {
        tables = tablesData;
      }
    } catch (error) {
      console.log('Error listing tables:', error);
    }

    const tableExists = tables.some((t: any) => (t.table_name || t).toString() === tableName);
    if (!tableExists) {
      return new Response(JSON.stringify({
        success: true,
        analysis: {
          summary: `I couldn't find a table named "${tableName}" in your database.`,
          data: null,
          recommendation: `Please check the table name spelling. Available tables might include common ones like "assessments", "criteria", "organizations", etc. Would you like me to help you find the correct table name?`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build base query
    let tableData: any[] = [];
    let oneRow: any = {};
    let recordCount = 0;
    
    try {
      let tableQuery = supabase.from(tableName).select('*');

      // Get a sample row to infer structure
      const { data: sampleData } = await supabase.from(tableName).select('*').limit(1).maybeSingle();
      if (sampleData) {
        oneRow = sampleData;
      }

      const inferredColumns = oneRow ? Object.keys(oneRow) : [];

      // Organization filter when applicable
      const hasOrgColumn = inferredColumns.includes('organization_id');
      if (hasOrgColumn && organizationId) {
        tableQuery = tableQuery.eq('organization_id', organizationId);
      }

      // Date window (last 6 months) if we have date columns
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsIso = sixMonthsAgo.toISOString();
      const datePriority = ['measurement_period_start', 'measurement_period_end', 'created_at', 'updated_at'];
      const dateCol = datePriority.find(c => inferredColumns.includes(c));
      if (dateCol) {
        tableQuery = tableQuery.gte(dateCol, sixMonthsIso);
      }

      // Order by best available timestamp
      if (dateCol) {
        tableQuery = tableQuery.order(dateCol, { ascending: false });
      } else if (inferredColumns.includes('created_at')) {
        tableQuery = tableQuery.order('created_at', { ascending: false });
      }

      // Reasonable limit for analysis
      tableQuery = tableQuery.limit(500);

      const { data: queryData, error: dataError } = await tableQuery;
      
      if (!dataError && queryData) {
        tableData = queryData;
        recordCount = tableData.length;
      }
    } catch (queryError) {
      console.log('Error querying table:', queryError);
    }

    console.log(`📊 Retrieved ${recordCount} records from ${tableName}`);

    // Prepare analysis data
    const sample = tableData?.[0] || oneRow || {};
    const schemaData = Object.keys(sample).map((key) => {
      const v = (sample as any)[key];
      const jsType = Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v);
      return { column_name: key, data_type: jsType, is_nullable: v === null ? 'YES' : 'UNKNOWN' };
    });

    const dateFieldHeuristics = (col: string) => {
      const lc = col.toLowerCase();
      return lc.includes('date') || lc.includes('time') || lc.endsWith('_at') || 
             lc === 'measurement_period_start' || lc === 'measurement_period_end';
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

    // Handle empty table case
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

What specific aspect would you like help with regarding your ${tableName.replace(/_/g, ' ')} data?`,
          queryMetadata: {
            tableName,
            recordCount,
            columnsAnalyzed: schemaData?.length || 0,
            hasOrganizationFilter: false,
            timestamp: new Date().toISOString()
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try AI analysis if OpenAI key is available
    if (openaiApiKey) {
      try {
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

Be specific and reference actual data values where relevant.`;

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

        if (openAIResponse.ok) {
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
                hasOrganizationFilter: !!organizationId,
                timestamp: new Date().toISOString()
              }
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (aiError) {
        console.log('AI analysis failed, providing fallback response:', aiError);
      }
    }

    // Fallback response when AI is not available
    return new Response(JSON.stringify({
      success: true,
      analysis: {
        summary: `I found ${recordCount} records in the "${tableName}" table. While I can't provide AI-powered insights right now, I can see your data structure and basic patterns.`,
        data: analysisData,
        recommendation: `Here's what I can tell you about your data:

• **Data Overview**: Found ${recordCount} records with ${schemaData?.length || 0} columns
• **Manual Review**: You can examine the data structure and recent entries
• **Date Fields**: ${dateFields.length > 0 ? `Monitor trends in: ${dateFields.join(', ')}` : 'No date fields detected'}
• **Numeric Fields**: ${numericFields.length > 0 ? `Track metrics in: ${numericFields.join(', ')}` : 'No numeric fields detected'}

The table appears to be actively used with recent data. Would you like me to help you interpret specific aspects of this data structure?`,
        queryMetadata: {
          tableName,
          recordCount,
          columnsAnalyzed: schemaData?.length || 0,
          hasOrganizationFilter: !!organizationId,
          timestamp: new Date().toISOString()
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-table-data function:', error);
    
    // Always return success with helpful message
    return new Response(JSON.stringify({
      success: true,
      analysis: {
        summary: `I encountered an issue while analyzing your table data, but I'm here to help in other ways.`,
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});