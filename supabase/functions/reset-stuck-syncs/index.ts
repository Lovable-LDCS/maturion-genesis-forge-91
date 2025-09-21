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

    console.log('Resetting stuck sync statuses...');

    // Find data sources that have been stuck in 'syncing' status for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: stuckSyncs, error: fetchError } = await supabase
      .from('data_sources')
      .select('id, source_name, updated_at')
      .eq('sync_status', 'syncing')
      .lt('updated_at', oneHourAgo);

    if (fetchError) {
      throw fetchError;
    }

    let resetCount = 0;
    if (stuckSyncs && stuckSyncs.length > 0) {
      console.log(`Found ${stuckSyncs.length} stuck syncs to reset`);
      
      const { error: updateError } = await supabase
        .from('data_sources')
        .update({
          sync_status: 'never_synced',
          sync_error_message: 'Sync was reset due to timeout',
          updated_at: new Date().toISOString()
        })
        .in('id', stuckSyncs.map(s => s.id));

      if (updateError) {
        throw updateError;
      }

      resetCount = stuckSyncs.length;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Reset ${resetCount} stuck sync(s)`,
      reset_count: resetCount,
      reset_sources: stuckSyncs?.map(s => ({ id: s.id, name: s.source_name })) || []
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error resetting stuck syncs:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});