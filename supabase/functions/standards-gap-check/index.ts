import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bootstrap catalog (file co-located for now). Future: move to DB tables.
// deno-lint-ignore no-explicit-any
let catalogCache: any | null = null;

async function loadCatalog() {
  if (catalogCache) return catalogCache;
  try {
    const url = new URL('./catalog.json', import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`failed to load catalog.json: ${res.status}`);
    catalogCache = await res.json();
    return catalogCache;
  } catch (e) {
    console.error('Catalog load error', e);
    return { standards: [] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'catalog';
    const organizationId = body?.organizationId || body?.organization_id || null;

    if (action === 'catalog') {
      const catalog = await loadCatalog();
      return new Response(JSON.stringify({ success: true, catalog }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'gap-check') {
      if (!organizationId) {
        return new Response(JSON.stringify({ success: false, error: 'organizationId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const catalog = await loadCatalog();

      // Placeholder: fetch minimal org snapshot (counts only)
      const tables = ['domains','maturity_practice_statements','criteria','ai_documents','ai_document_chunks'];
      const counts: Record<string, number> = {};
      for (const t of tables) {
        try {
          const { count } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true }).eq('organization_id', organizationId);
          counts[t] = count || 0;
        } catch {
          counts[t] = -1;
        }
      }

      // Minimal placeholder summary. Future: compute actual crosswalks per section.
      const summary = {
        standardsCount: catalog?.standards?.length || 0,
        org: { organizationId, counts },
        notes: 'Scaffold only: implement crosswalk of Domains/MPS/Criteria to standards sections and compute coverage/gaps.'
      };

      return new Response(JSON.stringify({ success: true, summary }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('standards-gap-check error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
