import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SaveCriteriaRequest = {
  organizationId: string;
  mpsId: string;
  userId?: string;
  items: Array<{ statement: string; summary?: string; original_statement?: string; }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body: SaveCriteriaRequest = await req.json();
    const { organizationId, mpsId, userId, items } = body || {};

    if (!organizationId || !mpsId || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'organizationId, mpsId and items are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get mps_number for numbering
    const { data: mpsRow, error: mpsErr } = await admin
      .from('maturity_practice_statements')
      .select('id, mps_number')
      .eq('id', mpsId)
      .maybeSingle();
    if (mpsErr || !mpsRow) throw new Error('MPS not found');

    // Determine next criteria index
    const { data: existing, error: existErr } = await admin
      .from('criteria')
      .select('criteria_number')
      .eq('mps_id', mpsId);
    if (existErr) throw existErr;

    let nextIndex = 1;
    for (const r of existing || []) {
      const part = String(r.criteria_number || '').split('.')[1];
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= nextIndex) nextIndex = n + 1;
    }

    const created_by = userId || '00000000-0000-0000-0000-000000000001';
    const toInsert = items.map((it, i) => ({
      organization_id: organizationId,
      mps_id: mpsId,
      criteria_number: `${mpsRow.mps_number}.${nextIndex + i}`,
      statement: it.statement.trim(),
      summary: it.summary ? it.summary.trim() : null,
      status: 'approved_locked',
      created_by,
      updated_by: created_by
    }));

    const { data: inserted, error: insErr } = await admin
      .from('criteria')
      .insert(toInsert)
      .select('id, criteria_number, statement, summary');
    if (insErr) throw insErr;

    // Log learning deltas if original text provided
    for (let idx = 0; idx < items.length; idx++) {
      const original = items[idx].original_statement || '';
      const modified = items[idx].statement || '';
      if (original && original !== modified) {
        await admin.from('ai_feedback_submissions').insert({
          organization_id: organizationId,
          user_id: created_by,
          feedback_type: 'approved',
          feedback_category: 'criteria',
          ai_generated_content: original,
          human_override_content: modified,
          justification: `criteria_number=${toInsert[idx].criteria_number}; mps_id=${mpsId}`,
          metadata: { entity: 'criteria', mps_id: mpsId, criteria_number: toInsert[idx].criteria_number }
        });
      }
    }

    return new Response(JSON.stringify({ success: true, count: inserted?.length || 0, criteria: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('save-criteria-list error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
