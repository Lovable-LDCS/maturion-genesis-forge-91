import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      version: '1.0.0',
      function: 'run-web-crawl-test',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🚀 Starting web crawl test for De Beers...');

    // Step 1: Seed De Beers domains
    console.log('📡 Seeding De Beers domains...');
    const seedResponse = await supabase.functions.invoke('seed-debeers-domains', {});
    
    if (seedResponse.error) {
      console.error('❌ Domain seeding failed:', seedResponse.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Domain seeding failed',
        details: seedResponse.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log('✅ Domains seeded:', seedResponse.data);

    // Step 2: Wait a moment then trigger crawl for primary domains
    await new Promise(resolve => setTimeout(resolve, 2000));

    const domainsToTest = [
      'https://www.debeersgroup.com',
      'https://www.debeers.com',
      'https://www.forevermark.com'
    ];

    const crawlResults = [];

    for (const url of domainsToTest) {
      console.log(`🕷️ Crawling ${url}...`);
      
      const crawlResponse = await supabase.functions.invoke('crawl-org-domain', {
        body: {
          orgId: 'e443d914-8756-4b29-9599-6a59230b87f3',
          url: url,
          priority: 200
        }
      });

      if (crawlResponse.error) {
        console.error(`❌ Crawl failed for ${url}:`, crawlResponse.error);
        crawlResults.push({
          url,
          success: false,
          error: crawlResponse.error
        });
      } else {
        console.log(`✅ Crawl completed for ${url}:`, crawlResponse.data);
        crawlResults.push({
          url,
          success: true,
          data: crawlResponse.data
        });
      }

      // Wait between crawls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Step 3: Get current stats
    const { data: pagesData } = await supabase
      .from('org_pages')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', 'e443d914-8756-4b29-9599-6a59230b87f3');

    const { data: chunksData } = await supabase
      .from('org_page_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', 'e443d914-8756-4b29-9599-6a59230b87f3');

    const { data: jobsData } = await supabase
      .from('org_ingest_jobs')
      .select('*')
      .eq('org_id', 'e443d914-8756-4b29-9599-6a59230b87f3')
      .order('started_at', { ascending: false })
      .limit(3);

    const stats = {
      pages: pagesData?.length || 0,
      chunks: chunksData?.length || 0,
      recent_jobs: jobsData || []
    };

    console.log('📊 Final stats:', stats);

    return new Response(JSON.stringify({
      success: true,
      seed_result: seedResponse.data,
      crawl_results: crawlResults,
      stats: stats,
      message: 'Web crawl test completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Web crawl test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});