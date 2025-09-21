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
      error: error instanceof Error ? error.message : String(error)
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
  // Separate statuses for logs vs data_sources table
  let logStatus = 'completed'; // data_source_sync_logs allowed values
  let sourceStatus = 'success'; // data_sources allowed values
  let errorMessage: string | null = null;
  const startTime = Date.now();

  try {
    console.log(`Performing sync for data source: ${dataSource.source_name} (${dataSource.source_type})`);

    // Update sync progress: Starting
    await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Establishing connection...');

    // For now, we'll just simulate a sync process
    // In a real implementation, this would connect to the actual data source
    // and sync data based on the source type

    switch (dataSource.source_type) {
      case 'supabase':
        // Test connection to verify it's working
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Testing Supabase connection...');
        await testSupabaseConnection(supabase, dataSource);
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Connection verified');
        itemsProcessed = 1;
        itemsAdded = 0; // No actual items to add for connection test
        break;
      
      case 'google_drive':
        // Sync Google Drive files
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Connecting to Google Drive...');
        await testGoogleDriveConnection(supabase, dataSource);
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Syncing files...');
        itemsProcessed = 1;
        break;
      
      case 'sharepoint':
        // Sync SharePoint documents  
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Connecting to SharePoint...');
        await testSharePointConnection(supabase, dataSource);
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Syncing documents...');
        itemsProcessed = 1;
        break;
      
      case 'rest_api':
      case 'api':
      case 'api_endpoint':
        // Test API connection
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'Testing API connection...');
        await testAPIConnection(supabase, dataSource);
        await updateSyncProgress(supabase, syncLogId, 'in_progress', 'API connection verified');
        itemsProcessed = 1;
        break;
      
      default:
        throw new Error(`Unsupported data source type: ${dataSource.source_type}`);
    }

    await updateSyncProgress(supabase, syncLogId, 'completed', 'Sync completed successfully');
    console.log(`Sync completed successfully for ${dataSource.source_name}`);
    // Final statuses
    logStatus = 'completed';
    sourceStatus = 'success';
  } catch (error) {
    console.error(`Sync failed for ${dataSource.source_name}:`, error);
    logStatus = 'failed';
    sourceStatus = 'failed';
    errorMessage = error instanceof Error ? error.message : String(error);
    itemsFailed = 1;
    
    // Update sync progress with error
    await updateSyncProgress(supabase, syncLogId, 'failed', `Sync failed: ${errorMessage}`);
  }

  // Update data source with final sync status
  const { error: updateError } = await supabase
    .from('data_sources')
    .update({
      sync_status: sourceStatus,
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
      sync_status: logStatus,
      items_processed: itemsProcessed,
      items_added: itemsAdded,
      items_updated: itemsUpdated,
      items_failed: itemsFailed,
      error_messages: errorMessage ? [errorMessage] : [],
      sync_summary: {
        source_type: dataSource.source_type,
        source_name: dataSource.source_name,
        sync_duration_ms: Date.now() - startTime,
        success: logStatus === 'completed'
      }
    })
    .eq('id', syncLogId);

  if (logUpdateError) {
    console.error('Error updating sync log:', logUpdateError);
  }
}

async function updateSyncProgress(supabase: any, syncLogId: string, status: string, message: string) {
  try {
    await supabase
      .from('data_source_sync_logs')
      .update({
        sync_status: status,
        sync_progress_message: message,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
  } catch (error) {
    console.error('Error updating sync progress:', error);
  }
}

async function testSupabaseConnection(supabase: any, dataSource: any) {
  // Test connection using Supabase client for better error handling
  const { data, error } = await supabase.functions.invoke('connect-data-source', {
    body: {
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    }
  });

  if (error) {
    throw new Error(`Supabase connection test failed: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data?.success) {
    throw new Error(`Supabase connection test failed: ${data?.error || 'Unknown error'}`);
  }
}

async function testGoogleDriveConnection(supabase: any, dataSource: any) {
  // Test connection using Supabase client for better error handling
  const { data, error } = await supabase.functions.invoke('connect-data-source', {
    body: {
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    }
  });

  if (error) {
    throw new Error(`Google Drive connection test failed: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data?.success) {
    throw new Error(`Google Drive connection test failed: ${data?.error || 'Unknown error'}`);
  }
}

async function testSharePointConnection(supabase: any, dataSource: any) {
  // Test connection using Supabase client for better error handling
  const { data, error } = await supabase.functions.invoke('connect-data-source', {
    body: {
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    }
  });

  if (error) {
    throw new Error(`SharePoint connection test failed: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data?.success) {
    throw new Error(`SharePoint connection test failed: ${data?.error || 'Unknown error'}`);
  }
}

async function testAPIConnection(supabase: any, dataSource: any) {
  // Test connection using Supabase client for better error handling
  const { data, error } = await supabase.functions.invoke('connect-data-source', {
    body: {
      data_source_id: dataSource.id,
      organization_id: dataSource.organization_id,
      connection_test: true
    }
  });

  if (error) {
    throw new Error(`API connection test failed: ${error.message || JSON.stringify(error)}`);
  }
  
  if (!data?.success) {
    throw new Error(`API connection test failed: ${data?.error || 'Unknown error'}`);
  }
}