import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Req = {
  organizationId: string;
  userId?: string;
  route?: string;
  notes: string; // free text to append
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body: Req = await req.json();
    const { organizationId, userId, route, notes } = body || {};

    if (!organizationId || !notes) {
      return new Response(JSON.stringify({ success: false, error: 'organizationId and notes are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Ensure bucket exists
    try {
      const { data: buckets } = await admin.storage.listBuckets();
      const exists = buckets?.some(b => b.id === 'chat-logs');
      if (!exists) {
        await admin.storage.createBucket('chat-logs', { public: false });
      }
    } catch (_e) { /* ignore if no permission in some environments */ }

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const iso = now.toISOString();

    const filename = `${yyyy}${mm}${dd}_session.md`;
    const path = `chat_logs/${filename}`;

    const section = [
      `## ${iso} UTC`,
      route ? `Route: ${route}` : '',
      `Org: ${organizationId}`,
      userId ? `User: ${userId}` : '',
      '',
      notes.trim(),
      '',
      '---',
      ''
    ].filter(Boolean).join('\n');

    // Try to download existing file to append
    let combined = section;
    try {
      const { data, error } = await admin.storage.from('chat-logs').download(path);
      if (!error && data) {
        const existing = await data.text();
        combined = existing + '\n' + section;
      }
    } catch { /* file may not exist yet */ }

    // Upload with upsert
    const blob = new Blob([combined], { type: 'text/markdown' });
    const { error: upErr } = await admin.storage.from('chat-logs').upload(path, blob, { upsert: true, contentType: 'text/markdown' });
    if (upErr) throw upErr;

    // Optional audit log
    try {
      await admin.from('audit_trail').insert({
        organization_id: organizationId,
        table_name: 'chat_logs',
        record_id: filename,
        action: 'append_session_summary',
        changed_by: userId || '00000000-0000-0000-0000-000000000001',
        change_reason: JSON.stringify({ route, timestamp: iso })
      });
    } catch { /* non-blocking */ }

    return new Response(JSON.stringify({ success: true, file: path }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('save-session-summary error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
