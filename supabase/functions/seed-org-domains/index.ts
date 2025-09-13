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

  try {
    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { org_id } = await req.json();
    
    if (!org_id) {
      throw new Error('Missing org_id parameter');
    }

    console.log('Seeding domains for org:', org_id);

    // Seed domains for the organization
    const domains = [
      { domain: 'debeersgroup.com', is_enabled: true, recrawl_hours: 24, crawl_depth: 2 },
      { domain: 'debeers.com', is_enabled: true, recrawl_hours: 24, crawl_depth: 2 },
      { domain: 'forevermark.com', is_enabled: true, recrawl_hours: 24, crawl_depth: 2 },
      { domain: 'ndtc.com.na', is_enabled: true, recrawl_hours: 24, crawl_depth: 2 }
    ];

    const results = [];
    
    for (const domainData of domains) {
      const { error } = await supabase
        .from('org_domains')
        .upsert({
          org_id,
          created_by: '00000000-0000-0000-0000-000000000001',
          updated_by: '00000000-0000-0000-0000-000000000001',
          ...domainData
        }, {
          onConflict: 'org_id,domain'
        });
        
      if (error) {
        console.error(`Error seeding ${domainData.domain}:`, error);
        results.push({ domain: domainData.domain, success: false, error: error.message });
      } else {
        console.log(`Successfully seeded ${domainData.domain}`);
        results.push({ domain: domainData.domain, success: true });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Domains seeded successfully',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in seed-org-domains:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});