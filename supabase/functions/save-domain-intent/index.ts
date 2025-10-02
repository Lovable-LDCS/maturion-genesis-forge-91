import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SaveIntentRequest = {
  organizationId: string;
  domainId: string;
  userId?: string;
  intent_statement: string;
  ai_suggested?: boolean;
  sources?: string[];
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body: SaveIntentRequest = await req.json();
    const { organizationId, domainId, userId, intent_statement, ai_suggested = true, sources = [] } = body || {};

    if (!organizationId || !domainId || !intent_statement) {
      return new Response(JSON.stringify({ success: false, error: 'organizationId, domainId and intent_statement are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify domain belongs to organization
    const { data: dom, error: domErr } = await admin
      .from('domains')
      .select('id, organization_id')
      .eq('id', domainId)
      .maybeSingle();

    if (domErr) throw domErr;
    if (!dom || dom.organization_id !== organizationId) {
      return new Response(JSON.stringify({ success: false, error: 'Domain not found for organization' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update domain intent fields
    const { data: upd, error: updErr } = await admin
      .from('domains')
      .update({
        ai_suggested_intent: ai_suggested ? intent_statement : null,
        intent_statement,
        intent_approved_at: new Date().toISOString(),
        intent_approved_by: userId || '00000000-0000-0000-0000-000000000001',
        updated_at: new Date().toISOString(),
        updated_by: userId || '00000000-0000-0000-0000-000000000001'
      })
      .eq('id', domainId)
      .select('id, name, intent_statement, intent_approved_at, intent_approved_by')
      .maybeSingle();

    if (updErr) throw updErr;

    // Optional: log an audit entry
    try {
      await admin.from('audit_trail').insert({
        organization_id: organizationId,
        table_name: 'domains',
        record_id: domainId,
        action: 'approve_intent',
        changed_by: userId || '00000000-0000-0000-0000-000000000001',
        change_reason: JSON.stringify({ sources, ai_suggested })
      });
    } catch (_) { /* non-blocking */ }

    return new Response(JSON.stringify({ success: true, domain: upd }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('save-domain-intent error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
