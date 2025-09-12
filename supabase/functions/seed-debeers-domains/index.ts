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

// De Beers domain allowlist as specified
const DEBEERS_DOMAINS = [
  { domain: 'debeersgroup.com', crawl_depth: 2, recrawl_hours: 168 },
  { domain: 'gss.debeersgroup.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'auctions.debeersgroup.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'verification.debeersgroup.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'tracr.com', crawl_depth: 1, recrawl_hours: 168 },
  { domain: 'debeers.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'forevermark.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'e6.com', crawl_depth: 1, recrawl_hours: 720 },
  { domain: 'debswana.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'namdeb.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'debmarine.com', crawl_depth: 1, recrawl_hours: 336 },
  { domain: 'ndtc.com.na', crawl_depth: 1, recrawl_hours: 336 }
];

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🌱 Seeding De Beers domains...');

    // Find De Beers organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'De Beers')
      .single();

    if (!org) {
      return new Response(JSON.stringify({
        success: false,
        error: 'De Beers organization not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    console.log(`✅ Found De Beers org: ${org.id}`);

    // Prepare domain data
    const domainData = DEBEERS_DOMAINS.map(domain => ({
      org_id: org.id,
      domain: domain.domain,
      crawl_depth: domain.crawl_depth,
      recrawl_hours: domain.recrawl_hours,
      is_enabled: true,
      created_by: '00000000-0000-0000-0000-000000000000',
      updated_by: '00000000-0000-0000-0000-000000000000'
    }));

    // Insert domains (upsert to handle duplicates)
    const { data: insertedDomains, error: insertError } = await supabase
      .from('org_domains')
      .upsert(domainData, { 
        onConflict: 'org_id,domain',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting domains:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: insertError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log(`✅ Seeded ${insertedDomains?.length || 0} domains`);

    // Trigger initial crawl for primary domain
    try {
      const crawlResponse = await supabase.functions.invoke('crawl-org-domain', {
        body: {
          orgId: org.id,
          url: 'https://www.debeersgroup.com',
          priority: 200
        }
      });

      console.log('🕷️ Initial crawl triggered for debeersgroup.com');
    } catch (crawlError) {
      console.log('⚠️ Could not trigger initial crawl:', crawlError);
    }

    return new Response(JSON.stringify({
      success: true,
      organization: org.name,
      domainsSeeded: insertedDomains?.length || 0,
      domains: DEBEERS_DOMAINS.map(d => d.domain)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Seeding error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});