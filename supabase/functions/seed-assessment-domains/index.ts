/* eslint-disable import/no-unresolved */
// Ambient declarations to satisfy VS Code TypeScript for Deno edge runtime imports
declare module 'https://deno.land/std@0.168.0/http/server.ts';
declare module 'https://esm.sh/@supabase/supabase-js@2.7.1';
// Minimal Deno typing for editor only (Supabase edge runtime provides Deno at runtime)
declare const Deno: { env: { get: (key: string) => string | undefined } };

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { org_id, user_id, domain_names } = await req.json();

    if (!org_id) {
      return new Response(JSON.stringify({ success: false, error: 'Missing org_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default domain set if none provided
    const defaults = [
      'Leadership & Governance',
      'Risk Management',
      'Security Operations',
      'Compliance & Oversight',
      'Incident Response & Resilience'
    ];

    const names: string[] = Array.isArray(domain_names) && domain_names.length ? domain_names : defaults;

    // Upsert-like behavior: insert only those that do not already exist for this org
    const { data: existing, error: exErr } = await supabase
      .from('domains')
      .select('id,name')
      .eq('organization_id', org_id);
    if (exErr) throw exErr;

    const existingNames = new Set((existing || []).map((d: { name: string }) => d.name));

    const rows = names
      .filter((n) => !existingNames.has(n))
      .map((n) => ({
        name: n,
        organization_id: org_id,
        created_by: user_id || '00000000-0000-0000-0000-000000000001',
        updated_by: user_id || '00000000-0000-0000-0000-000000000001',
      }));

    let inserted: Array<{ id: string; name: string }> = [];
    if (rows.length > 0) {
      const { data, error } = await supabase
        .from('domains')
        .insert(rows)
        .select('id,name');
      if (error) throw error;
      inserted = data || [];
    }

    return new Response(JSON.stringify({ success: true, inserted, skipped: names.length - rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('seed-assessment-domains error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});