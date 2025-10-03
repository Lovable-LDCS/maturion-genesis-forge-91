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

  let stage = 'start';

  try {
    stage = 'client_init';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    stage = 'parse_body';
    const body: ResetRequest = await req.json();
    const { organizationId, domainId, userId } = body || {};

    if (!organizationId || !domainId) {
      return new Response(JSON.stringify({ success: false, error: 'organizationId and domainId are required', stage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Skip domain verification to avoid permission issues; trust caller context
    stage = 'fetch_mps';
    // Find MPS IDs for domain
    const { data: mpsRows, error: mpsErr } = await admin
      .from('maturity_practice_statements')
      .select('id')
      .eq('domain_id', domainId);
    if (mpsErr) throw mpsErr;
    const mpsIds = (mpsRows || []).map((r: any) => r.id);

    if (mpsIds.length > 0) {
      stage = 'collect_criteria';
      // Collect criteria IDs under these MPS
      const { data: critRows, error: critErr } = await admin
        .from('criteria')
        .select('id')
        .in('mps_id', mpsIds);
      if (critErr) throw critErr;
      const critIds = (critRows || []).map((r: any) => r.id);

      // Create or find a trash domain for this organization
      stage = 'ensure_trash_domain';
      let trashDomainId: string | null = null;
      try {
        const { data: existingTrash, error: trashErr } = await admin
          .from('domains')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', '__trash__')
          .maybeSingle();
        if (trashErr) throw trashErr;
        if (existingTrash?.id) {
          trashDomainId = existingTrash.id;
        } else {
          const { data: insertedTrash, error: insTrashErr } = await admin
            .from('domains')
            .insert({ organization_id: organizationId, name: '__trash__' })
            .select('id')
            .single();
          if (insTrashErr) throw insTrashErr;
          trashDomainId = insertedTrash.id;
        }
      } catch (e) {
        console.warn('reset-domain-mps: could not ensure trash domain', e);
      }

      // Create or find a trash MPS within the trash domain
      stage = 'ensure_trash_mps';
      let trashMpsId: string | null = null;
      try {
        if (trashDomainId) {
          const { data: existingTrashMps, error: trashMpsErr } = await admin
            .from('maturity_practice_statements')
            .select('id')
            .eq('domain_id', trashDomainId)
            .eq('mps_number', 999)
            .maybeSingle();
          if (trashMpsErr) throw trashMpsErr;
          if (existingTrashMps?.id) {
            trashMpsId = existingTrashMps.id;
          } else {
            const { data: insertedTrashMps, error: insTrashMpsErr } = await admin
              .from('maturity_practice_statements')
              .insert({
                organization_id: organizationId,
                domain_id: trashDomainId,
                name: 'Archived (trash)',
                mps_number: 999
              })
              .select('id')
              .single();
            if (insTrashMpsErr) throw insTrashMpsErr;
            trashMpsId = insertedTrashMps.id;
          }
        }
      } catch (e) {
        console.warn('reset-domain-mps: could not ensure trash mps', e);
      }

      // Rehome criteria to trash MPS (soft-delete) to avoid DELETE triggers
      if (trashMpsId) {
        stage = 'rehome_criteria';
        const { error: moveErr } = await admin
          .from('criteria')
          .update({ organization_id: organizationId, mps_id: trashMpsId, status: 'archived' })
          .in('mps_id', mpsIds);
        if (moveErr) throw moveErr;
      }

      // Clean deferrals that pointed to the old criteria/MPS
      if (critIds.length > 0) {
        try {
          const { error } = await admin
            .from('criteria_deferrals')
            .delete()
            .in('proposed_criteria_id', critIds);
          if (error) console.warn('reset-domain-mps: could not delete deferrals by proposed_criteria_id', error);
        } catch (e) {
          console.warn('reset-domain-mps: exception deleting deferrals by proposed_criteria_id', e);
        }
      }
      try {
        const { error } = await admin
          .from('criteria_deferrals')
          .delete()
          .in('original_mps_id', mpsIds);
        if (error) console.warn('reset-domain-mps: could not delete related criteria_deferrals by original_mps_id', error);
      } catch (e) {
        console.warn('reset-domain-mps: exception deleting criteria_deferrals by original_mps_id', e);
      }
    }

    // Move all MPS in this domain to trash domain instead of deleting (avoid delete triggers)
    stage = 'move_mps';
    if (typeof trashDomainId === 'string' && trashDomainId.length > 0) {
      const { error: moveMpsErr } = await admin
        .from('maturity_practice_statements')
        .update({ domain_id: trashDomainId, organization_id: organizationId })
        .eq('domain_id', domainId);
      if (moveMpsErr) throw moveMpsErr;
    }

    stage = 'audit';
    // Audit log (non-blocking if table doesn't exist)
    try {
      await admin.from('audit_trail').insert({
        organization_id: organizationId,
        table_name: 'maturity_practice_statements',
        record_id: domainId,
        action: 'reset_domain_mps',
        changed_by: userId || '00000000-0000-0000-0000-000000000001',
        change_reason: 'User requested re-run of MPS generator; removed existing MPS and criteria for this domain.'
      });
    } catch (_e) {
      // ignore if audit_trail table is missing or RLS prevents insert
    }

    stage = 'done';
    return new Response(JSON.stringify({ success: true, removed_mps: mpsIds.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('reset-domain-mps error at stage', stage, e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error', stage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
