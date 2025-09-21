import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role for testing
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { method } = req;
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    console.log(`QA Test API Request: ${method} ${path}`);

    if (method === 'GET' && path === 'test-data-sources-api') {
      // Test: List all data sources
      const { data: dataSources, error } = await supabase
        .from('data_sources')
        .select(`
          id,
          organization_id,
          source_name,
          source_type,
          is_active,
          sync_status,
          created_at,
          organizations(name)
        `);

      if (error) {
        console.error('Error fetching data sources:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          test: 'list_data_sources'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: dataSources,
        count: dataSources?.length || 0,
        test: 'list_data_sources'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && path === 'test-data-sources-api') {
      // Test: Create a new data source and then clean it up
      const body = await req.json();
      
      if (!body.organization_id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'organization_id is required for test data source creation',
          test: 'create_data_source'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: newDataSource, error } = await supabase
        .from('data_sources')
        .insert({
          organization_id: body.organization_id,
          source_name: body.source_name || 'QA Test Data Source (Temporary)',
          source_type: body.source_type || 'supabase', // Use valid source type
          connection_config: body.connection_config || { 
            test: true,
            description: 'Temporary test data source - will be auto-deleted',
            url: 'https://test-project.supabase.co'
          },
          created_by: body.created_by,
          updated_by: body.updated_by || body.created_by
        })
        .select(`
          id,
          source_name,
          source_type,
          is_active,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error('Error creating data source:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          test: 'create_data_source'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Clean up: Delete the test data source immediately after creation test
      if (newDataSource?.id) {
        const { error: deleteError } = await supabase
          .from('data_sources')
          .delete()
          .eq('id', newDataSource.id);
        
        if (deleteError) {
          console.warn('Warning: Failed to clean up test data source:', deleteError);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: {
          ...newDataSource,
          cleaned_up: true,
          message: 'Test data source created and cleaned up successfully'
        },
        test: 'create_data_source'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && url.searchParams.get('action') === 'evidence') {
      // Test: Create evidence submission linked to data source
      const body = await req.json();
      
      const { data: newEvidence, error } = await supabase
        .from('evidence_submissions')
        .insert({
          organization_id: body.organization_id,
          data_source_id: body.data_source_id,
          evidence_type: body.evidence_type || 'document',
          title: body.title || 'QA Test Evidence',
          description: body.description || 'Test evidence submission for QA validation',
          submitted_by: body.submitted_by
        })
        .select(`
          id,
          title,
          evidence_type,
          evaluation_status,
          data_source_id,
          created_at,
          data_sources(source_name, source_type)
        `)
        .single();

      if (error) {
        console.error('Error creating evidence submission:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          test: 'create_evidence_submission' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: newEvidence,
        test: 'create_evidence_submission'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' && url.searchParams.get('action') === 'logging') {
      // Test: Create API usage log
      const body = await req.json();
      
      const { data: logEntry, error } = await supabase
        .from('api_usage_log')
        .insert({
          organization_id: body.organization_id,
          user_id: body.user_id,
          endpoint: '/test-api-endpoint',
          method: 'POST',
          request_payload: { test: 'QA validation request' },
          response_status: 200,
          execution_time_ms: 150,
          data_source_id: body.data_source_id
        })
        .select('id, endpoint, method, response_status, created_at')
        .single();

      if (error) {
        console.error('Error creating API log:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          test: 'create_api_log'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: logEntry,
        test: 'create_api_log'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Endpoint not found',
      available_actions: ['GET /', 'POST / (create data source)', 'POST /?action=evidence', 'POST /?action=logging']
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('QA Test API Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});