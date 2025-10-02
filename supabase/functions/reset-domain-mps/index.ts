import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ResetRequest = {
  organizationId: string;
  domainId: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body: ResetRequest = await req.json();
    const { organizationId, domainId, userId } = body || {};

    if (!organizationId || !domainId) {
      return new Response(JSON.stringify({ success: false, error: 'organizationId and domainId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify domain belongs to org and not locked
    const { data: dom, error: domErr } = await admin
      .from('domains')
      .select('id, organization_id, status')
      .eq('id', domainId)
      .maybeSingle();
    if (domErr) throw domErr;
    if (!dom || dom.organization_id !== organizationId) {
      return new Response(JSON.stringify({ success: false, error: 'Domain not found for organization' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (dom.status === 'approved_locked' || dom.status === 'completed') {
      return new Response(JSON.stringify({ success: false, error: 'Domain is locked; cannot reset MPS' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find MPS IDs for domain
    const { data: mpsRows, error: mpsErr } = await admin
      .from('maturity_practice_statements')
      .select('id')
      .eq('domain_id', domainId);
    if (mpsErr) throw mpsErr;
    const mpsIds = (mpsRows || []).map(r => r.id);

    // Delete criteria first to avoid FK issues
    if (mpsIds.length > 0) {
      const { error: delCritErr } = await admin
        .from('criteria')
        .delete()
        .in('mps_id', mpsIds);
      if (delCritErr) throw delCritErr;
    }

    // Delete MPS
    const { error: delMpsErr } = await admin
      .from('maturity_practice_statements')
      .delete()
      .eq('domain_id', domainId);
    if (delMpsErr) throw delMpsErr;

    // Audit log
    await admin.from('audit_trail').insert({
      organization_id: organizationId,
      table_name: 'maturity_practice_statements',
      record_id: domainId,
      action: 'reset_domain_mps',
      changed_by: userId || '00000000-0000-0000-0000-000000000001',
      change_reason: 'User requested re-run of MPS generator; removed existing MPS and criteria for this domain.'
    });

    return new Response(JSON.stringify({ success: true, removed_mps: mpsIds.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('reset-domain-mps error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
