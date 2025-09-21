import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data_source_id } = await req.json();

    if (!data_source_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'data_source_id is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting sync for data source: ${data_source_id}`);

    // Fetch the data source
    const { data: dataSource, error: fetchError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', data_source_id)
      .single();

    if (fetchError || !dataSource) {
      console.error('Error fetching data source:', fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Data source not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update sync status to syncing
    const { error: updateError } = await supabase
      .from('data_sources')
      .update({
        sync_status: 'syncing',
        sync_error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', data_source_id);

    if (updateError) {
      console.error('Error updating sync status:', updateError);
      throw updateError;
    }

    // Create sync log entry
    const syncLogId = crypto.randomUUID();
    const { error: logError } = await supabase
      .from('data_source_sync_logs')
      .insert({
        id: syncLogId,
        data_source_id: data_source_id,
        organization_id: dataSource.organization_id,
        sync_started_at: new Date().toISOString(),
        sync_status: 'in_progress',
        items_processed: 0,
        items_added: 0,
        items_updated: 0,
        items_failed: 0,
        triggered_by: dataSource.created_by
      });

    if (logError) {
      console.error('Error creating sync log:', logError);
    }

    // Start the sync process in the background
    EdgeRuntime.waitUntil(performDataSourceSync(supabase, dataSource, syncLogId));

    return new Response(JSON.stringify({
      success: true,
      message: 'Data source sync initiated',
      sync_log_id: syncLogId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in sync-data-source:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function performDataSourceSync(supabase: any, dataSource: any, syncLogId: string) {
  let itemsProcessed = 0;
  let itemsAdded = 0;
  let itemsUpdated = 0;
  let itemsFailed = 0;
  let syncStatus = 'completed';
  let errorMessage = null;

  try {
    console.log(`Performing sync for data source: ${dataSource.source_name} (${dataSource.source_type})`);

    // For now, we'll just simulate a sync process
    // In a real implementation, this would connect to the actual data source
    // and sync data based on the source type

    switch (dataSource.source_type) {
      case 'supabase':
        // Test connection to verify it's working
        await testSupabaseConnection(dataSource);
        itemsProcessed = 1;
        itemsAdded = 0; // No actual items to add for connection test
        break;
      
      case 'google_drive':
        // Sync Google Drive files
        await testGoogleDriveConnection(dataSource);
        itemsProcessed = 1;
        break;
      
      case 'sharepoint':
        // Sync SharePoint documents  
        await testSharePointConnection(dataSource);
        itemsProcessed = 1;
        break;
      
      case 'rest_api':
        // Test API connection
        await testAPIConnection(dataSource);
        itemsProcessed = 1;
        break;
      
      default:
        throw new Error(`Unsupported data source type: ${dataSource.source_type}`);
    }

    console.log(`Sync completed successfully for ${dataSource.source_name}`);
    
  } catch (error) {
    console.error(`Sync failed for ${dataSource.source_name}:`, error);
    syncStatus = 'failed';
    errorMessage = error.message;
    itemsFailed = 1;
  }

  // Update data source with final sync status
  const { error: updateError } = await supabase
    .from('data_sources')
    .update({
      sync_status: syncStatus,
      sync_error_message: errorMessage,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', dataSource.id);

  if (updateError) {
    console.error('Error updating final sync status:', updateError);
  }

  // Update sync log with final results
  const { error: logUpdateError } = await supabase
    .from('data_source_sync_logs')
    .update({
      sync_completed_at: new Date().toISOString(),
      sync_status: syncStatus,
      items_processed: itemsProcessed,
      items_added: itemsAdded,
      items_updated: itemsUpdated,
      items_failed: itemsFailed,
      error_messages: errorMessage ? [errorMessage] : [],
      sync_summary: {
        source_type: dataSource.source_type,
        source_name: dataSource.source_name,
        sync_duration_ms: Date.now() - new Date(syncLogId).getTime(),
        success: syncStatus === 'completed'
      }
    })
    .eq('id', syncLogId);

  if (logUpdateError) {
    console.error('Error updating sync log:', logUpdateError);
  }
}

async function testSupabaseConnection(dataSource: any) {
  // Test Supabase connection by calling connect-data-source function
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/connect-data-source`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Supabase connection test failed: ${error.error}`);
  }
}

async function testGoogleDriveConnection(dataSource: any) {
  // Similar connection test for Google Drive
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/connect-data-source`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Drive connection test failed: ${error.error}`);
  }
}

async function testSharePointConnection(dataSource: any) {
  // Similar connection test for SharePoint
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/connect-data-source`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`SharePoint connection test failed: ${error.error}`);
  }
}

async function testAPIConnection(dataSource: any) {
  // Similar connection test for REST API
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/connect-data-source`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API connection test failed: ${error.error}`);
  }
}