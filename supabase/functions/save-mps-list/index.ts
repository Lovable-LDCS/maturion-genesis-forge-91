// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SaveRequest = {
  organizationId: string;
  domainId: string;
  userId?: string; // used for created_by/updated_by
  items: Array<{
    number: string | number;
    title: string;
    intent?: string;
    summary?: string;
  }>;
  upsert?: boolean; // if true, update existing MPS with same domain+number
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body: SaveRequest = await req.json();
    const { organizationId, domainId, userId, items, upsert = true } = body || {};

    if (!organizationId || !domainId) {
      return new Response(JSON.stringify({ success: false, error: 'organizationId and domainId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No items to save' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Normalize items
    const rows = items.map((it) => {
      const num = typeof it.number === 'string' ? parseInt(it.number, 10) : it.number;
      const safeNum = Number.isFinite(num) && num > 0 ? num : 1;
      return {
        organization_id: organizationId,
        domain_id: domainId,
        mps_number: safeNum,
        name: (it.title || '').toString().trim() || `MPS ${safeNum}`,
        summary: (it.summary || null) ? String(it.summary).trim() : null,
        ai_suggested_intent: (it.intent || null) ? String(it.intent).trim() : null,
        created_by: userId || '00000000-0000-0000-0000-000000000001',
        updated_by: userId || '00000000-0000-0000-0000-000000000001',
      };
    });

    // Apply simple preference learning: if org has mps label patterns, map titles
    try {
      const { data: patterns } = await admin
        .from('ai_learning_patterns')
        .select('pattern_text,replacement_suggestion,cross_org_applicable')
        .eq('organization_id', organizationId)
        .eq('pattern_category', 'mps_label')
        .eq('is_active', true);
      if (patterns && patterns.length) {
        for (const r of rows) {
          const p = patterns.find((p: any) => (p.pattern_text || '').toLowerCase() === r.name.toLowerCase());
          if (p?.replacement_suggestion) {
            r.name = p.replacement_suggestion;
          }
        }
      }
    } catch { /* non-blocking */ }

    // Manual upsert to avoid ON CONFLICT requirement
    const saved: any[] = [];
    for (const r of rows) {
      // Check if existing MPS with same (domain_id, mps_number)
      const { data: exists, error: selErr } = await admin
        .from('maturity_practice_statements')
        .select('id, name, summary, intent_statement')
        .eq('domain_id', r.domain_id)
        .eq('mps_number', r.mps_number)
        .limit(1);
      if (selErr) throw selErr;

      if (exists && exists.length > 0) {
        const current = exists[0];
        const id = current.id;
        const nextIntent = r.ai_suggested_intent ? r.ai_suggested_intent : current.intent_statement;
        const { data: upd, error: updErr } = await admin
          .from('maturity_practice_statements')
          .update({
            name: r.name,
            ai_suggested_intent: r.ai_suggested_intent,
            intent_statement: nextIntent || null,
            intent_approved_at: nextIntent ? new Date().toISOString() : null,
            intent_approved_by: nextIntent ? (r.updated_by) : null,
            summary: r.summary,
            updated_by: r.updated_by,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('id, name, mps_number, domain_id, summary, intent_statement');
        if (updErr) throw updErr;
        if (upd && upd.length) {
          const updated = upd[0];
          saved.push(updated);
          // Log learning deltas for edits
          const deltas: Array<{ field: string; original: string | null; modified: string | null }> = [
            { field: 'name', original: current.name, modified: r.name },
            { field: 'summary', original: current.summary, modified: r.summary },
            { field: 'intent_statement', original: current.intent_statement, modified: nextIntent || null }
          ];
          for (const d of deltas) {
            if ((d.original || '') !== (d.modified || '')) {
              await admin.from('ai_feedback_submissions').insert({
                organization_id: organizationId,
                user_id: r.updated_by,
                feedback_type: 'approved',
                feedback_category: 'mps',
                ai_generated_content: String(d.original ?? ''),
                human_override_content: String(d.modified ?? ''),
                justification: `field=${d.field}; mps_id=${id}`,
                metadata: { entity: 'mps', mps_id: id, field: d.field }
              });
            }
          }
        }
      } else {
        const intentStmt = r.ai_suggested_intent || null;
        const { data: ins, error: insErr } = await admin
          .from('maturity_practice_statements')
          .insert([{ 
            ...r,
            intent_statement: intentStmt,
            intent_approved_at: intentStmt ? new Date().toISOString() : null,
            intent_approved_by: intentStmt ? (r.created_by) : null,
          }])
          .select('id, name, mps_number, domain_id, summary, intent_statement');
        if (insErr) throw insErr;
        if (ins && ins.length) {
          const inserted = ins[0];
          saved.push(inserted);
          // Log learning entries for inserted values (original considered empty)
          const deltas: Array<{ field: string; original: string | null; modified: string | null }> = [
            { field: 'name', original: null, modified: r.name },
            { field: 'summary', original: null, modified: r.summary },
            { field: 'intent_statement', original: null, modified: intentStmt }
          ];
          for (const d of deltas) {
            if (d.modified) {
              await admin.from('ai_feedback_submissions').insert({
                organization_id: organizationId,
                user_id: r.created_by,
                feedback_type: 'approved',
                feedback_category: 'mps',
                ai_generated_content: String(d.original ?? ''),
                human_override_content: String(d.modified ?? ''),
                justification: `field=${d.field}; mps_id=${inserted.id}`,
                metadata: { entity: 'mps', mps_id: inserted.id, field: d.field }
              });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, count: saved.length, saved, rowsAttempted: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('save-mps-list error:', err);
    let message = 'Unknown error';
    try { message = err?.message || JSON.stringify(err); } catch { /* ignore */ }
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});