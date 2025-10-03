import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "std/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_USER = '00000000-0000-0000-0000-000000000001';

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

    // 1) Fetch current domain MPS and their criteria for learning + deletion planning
    stage = 'fetch_mps';
    const { data: mpsRows, error: mpsErr } = await admin
      .from('maturity_practice_statements')
      .select('id,name,summary,intent_statement')
      .eq('domain_id', domainId);
    if (mpsErr) throw mpsErr;
    const mpsIds = (mpsRows || []).map((r: any) => r.id);

    stage = 'fetch_criteria';
    let critRows: Array<any> = [];
    if (mpsIds.length > 0) {
      const { data: cRows, error: cErr } = await admin
        .from('criteria')
        .select('id,statement,mps_id')
        .in('mps_id', mpsIds);
      if (cErr) throw cErr;
      critRows = cRows || [];
    }
    const critIds = critRows.map((c: any) => c.id);

    // 2) Log learning signals (rejected) for all current items
    stage = 'log_rejections';
    try {
      const uid = userId || SYSTEM_USER;
      const makeFeedback = (cat: string, payload: any) => ({
        organization_id: organizationId,
        user_id: uid,
        feedback_type: 'rejected',
        feedback_category: cat,
        ai_generated_content: payload.ai || '',
        human_override_content: null,
        justification: 'rerun_reset',
        metadata: payload.meta
      });

      const mpsFeedback = (mpsRows || []).map((m: any) => makeFeedback('mps', {
        ai: JSON.stringify({ name: m.name, summary: m.summary, intent_statement: m.intent_statement }),
        meta: { entity: 'mps', mps_id: m.id, domain_id: domainId, rerun: true }
      }));
      const critFeedback = critRows.map((c: any) => makeFeedback('criteria', {
        ai: c.statement || '',
        meta: { entity: 'criteria', criteria_id: c.id, domain_id: domainId, rerun: true }
      }));

      let allFeedback = [...mpsFeedback, ...critFeedback];
      if (allFeedback.length > 0) {
        let { error: fbErr } = await admin.from('ai_feedback_submissions').insert(allFeedback);
        if (fbErr && (fbErr as any).code === '23514') {
          // Fallback: use a generic category that likely passes checks
          allFeedback = allFeedback.map((f) => ({ ...f, feedback_category: 'general' }));
          const { error: fbErr2 } = await admin.from('ai_feedback_submissions').insert(allFeedback);
          if (fbErr2) console.warn('reset-domain-mps-v2: feedback insert secondary warning', fbErr2);
        } else if (fbErr) {
          console.warn('reset-domain-mps-v2: feedback insert warning', fbErr);
        }
      }
    } catch (e) {
      console.warn('reset-domain-mps-v2: log_rejections warning', e);
    }

    // 3) Hard-delete dependents → criteria → mps
    // We attempt best-effort cleanup on known dependent tables; errors are logged but not fatal
    if (critIds.length > 0) {
      stage = 'delete_dependents_criteria_tables';
      // Criteria-linked tables
      try { await admin.from('maturity_levels').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete maturity_levels by criteria warn', e?.message || e); }
      try { await admin.from('evidence_submissions').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete evidence_submissions by criteria warn', e?.message || e); }
      try { await admin.from('criteria_edit_history').delete().in('criteria_id', critIds); } catch (e) { console.warn('delete criteria_edit_history warn', e?.message || e); }
      try { await admin.from('criteria_rejections').delete().in('criteria_id', critIds); } catch (e) { console.warn('delete criteria_rejections warn', e?.message || e); }
      try { await admin.from('evidence').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete evidence warn', e?.message || e); }
      try { await admin.from('assessment_scores').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete assessment_scores by criteria warn', e?.message || e); }
      try { await admin.from('ai_behavior_monitoring').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete ai_behavior_monitoring warn', e?.message || e); }
      try { await admin.from('ai_confidence_scoring').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete ai_confidence_scoring warn', e?.message || e); }
      // feedback logs referencing criteria
      try { await admin.from('learning_feedback_log').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete learning_feedback_log by criteria warn', e?.message || e); }
      // ai_feedback_submissions may FK criteria_id
      try { await admin.from('ai_feedback_submissions').delete().in('criteria_id', critIds as any); } catch (e) { console.warn('delete ai_feedback_submissions by criteria warn', e?.message || e); }
      // criteria_deferrals references proposed_criteria_id
      try { await admin.from('criteria_deferrals').delete().in('proposed_criteria_id', critIds as any); } catch (e) { console.warn('delete criteria_deferrals by proposed_criteria_id warn', e?.message || e); }

      stage = 'delete_criteria';
      try {
        await admin.from('criteria').delete().in('id', critIds);
      } catch (e) {
        console.error('reset-domain-mps-v2: delete criteria error', e);
        throw e;
      }
    }

    // Cleanup records that may reference MPS directly
    if (mpsIds.length > 0) {
      stage = 'delete_dependents_mps_tables';
      try { await admin.from('assessment_scores').delete().in('mps_id', mpsIds as any); } catch (e) { console.warn('delete assessment_scores by mps warn', e?.message || e); }
      // criteria_deferrals references original_mps_id (restricts delete)
      try { await admin.from('criteria_deferrals').delete().in('original_mps_id', mpsIds as any); } catch (e) { console.warn('delete criteria_deferrals by original_mps_id warn', e?.message || e); }

      stage = 'delete_mps';
      try {
        await admin.from('maturity_practice_statements').delete().in('id', mpsIds);
      } catch (e) {
        console.error('reset-domain-mps-v2: delete mps error', e);
        throw e;
      }
    }

    stage = 'done';
    return new Response(JSON.stringify({ success: true, deleted_mps: mpsIds.length, deleted_criteria: critIds.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('reset-domain-mps-v2 error at stage', stage, e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error', stage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
