import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Req = {
  organizationId: string;
  limit?: number;
};

type ListItem = { name: string; path: string; signedUrl?: string };

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body: Req = await req.json();
    const { organizationId, limit = 50 } = body || {};

    if (!organizationId) {
      return new Response(JSON.stringify({ success: false, error: 'organizationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // We use a date-based filename format: chat_logs/YYYYMMDD_session.md
    const prefix = 'chat_logs';
    const { data: list, error: listErr } = await admin.storage.from('chat-logs').list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'desc' },
    });
    if (listErr) throw listErr;

    // The files are not per-organization in the filename, but the content section includes org id.
    // For now, return the latest N files (sorted by name desc which is date-desc).
    const files = (list || [])
      .filter((f) => f.name.endsWith('_session.md'))
      .slice(0, limit)
      .map<ListItem>((f) => ({ name: f.name, path: `${prefix}/${f.name}` }));

    // Create signed URLs so client can view content from private bucket
    const items: ListItem[] = [];
    for (const f of files) {
      try {
        const { data: signed, error: signErr } = await admin
          .storage
          .from('chat-logs')
          .createSignedUrl(f.path, 60 * 60); // 1 hour
        if (signErr) {
          items.push({ ...f });
        } else {
          items.push({ ...f, signedUrl: signed?.signedUrl });
        }
      } catch (_e) {
        items.push({ ...f });
      }
    }

    return new Response(JSON.stringify({ success: true, items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('list-session-summaries error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
