import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint (public, no auth required)
  if (req.method === 'GET' && new URL(req.url).pathname === '/health') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      version: '1.0.0',
      function: 'schedule-nightly-crawl',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  // Validate cron key for security (only for POST requests)
  const cronKey = req.headers.get('x-cron-key');
  const expectedCronKey = Deno.env.get('CRON_KEY');
  
  if (!cronKey || !expectedCronKey || cronKey !== expectedCronKey) {
    console.error('Unauthorized cron request - missing or invalid x-cron-key header');
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized: Invalid or missing cron key'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Running scheduled nightly crawl...');

    // Get all organizations with enabled domains
    const { data: orgs, error: orgsError } = await supabase
      .from('org_domains')
      .select('org_id')
      .eq('is_enabled', true);

    if (orgsError) {
      throw new Error(`Failed to get organizations: ${orgsError.message}`);
    }

    const uniqueOrgs = [...new Set(orgs?.map(org => org.org_id) || [])];
    const results = [];

    for (const orgId of uniqueOrgs) {
      try {
        // Create ingest job for this org
        const { data: job, error: jobError } = await supabase
          .from('org_ingest_jobs')
          .insert({
            org_id: orgId,
            job_type: 'crawl_extract',
            status: 'scheduled',
            stats: { scheduled_at: new Date().toISOString(), trigger: 'nightly_cron' },
            started_by: '00000000-0000-0000-0000-000000000001'
          })
          .select()
          .single();

        if (jobError) {
          console.error(`Failed to create job for org ${orgId}:`, jobError);
          results.push({ org_id: orgId, success: false, error: jobError.message });
          continue;
        }

        // Trigger crawl for this org
        const { error: crawlError } = await supabase.functions.invoke('crawl-org-domain', {
          body: { orgId, priority: 'scheduled' }
        });

        if (crawlError) {
          console.error(`Failed to trigger crawl for org ${orgId}:`, crawlError);
          results.push({ org_id: orgId, success: false, error: crawlError.message });
        } else {
          console.log(`Successfully scheduled crawl for org ${orgId}`);
          results.push({ org_id: orgId, success: true, job_id: job.id });
        }
      } catch (error) {
        console.error(`Error processing org ${orgId}:`, error);
        results.push({ org_id: orgId, success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Nightly crawl scheduled',
      processed_orgs: uniqueOrgs.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in schedule-nightly-crawl:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});