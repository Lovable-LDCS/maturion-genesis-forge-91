import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GenRequest = {
  organizationId: string;
  domainId?: string;
  domainName?: string;
  limit?: number;
};

type IntentOut = {
  domain_id: string;
  intent_statement: string;
  ai_suggested: boolean;
  knowledge_base_used: boolean;
  source_documents: string[];
};

type SAISearchResult = {
  chunk_id?: string;
  document_id: string;
  document_name: string;
  document_type?: string;
  content?: string;
  similarity?: number;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body: GenRequest = await req.json();
    const { organizationId, domainId, domainName, limit = 8 } = body || {};

    if (!organizationId || (!domainId && !domainName)) {
      return new Response(JSON.stringify({ error: 'organizationId and (domainId or domainName) are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve domain info
    let resolvedDomainId = domainId || '';
    let resolvedDomainName = domainName || '';

    if (!resolvedDomainId || !resolvedDomainName) {
      const { data: domainRow, error: domErr } = await supabase
        .from('domains')
        .select('id,name')
        .eq(domainId ? 'id' : 'name', domainId ? domainId : domainName!)
        .maybeSingle();
      if (domErr) throw domErr;
      if (!domainRow) {
        return new Response(JSON.stringify({ error: 'Domain not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      resolvedDomainId = domainRow.id;
      resolvedDomainName = domainRow.name;
    }

    // Retrieve contextual snippets via existing search function
    const queries = [
      `${resolvedDomainName} intent`,
      `${resolvedDomainName} purpose`,
      `${resolvedDomainName} objective`,
      `${resolvedDomainName} governance intent`,
    ];

    const agg: SAISearchResult[] = [];
    for (const q of queries) {
      try {
        const { data, error } = await supabase.functions.invoke('search-ai-context', {
          body: { query: q, organizationId, limit, threshold: 0.2 }
        });
        const d = data as { success?: boolean; results?: SAISearchResult[] } | null;
        if (!error && d?.results?.length) agg.push(...d.results);
      } catch (_) { /* ignore */ }
    }

    // Deduplicate & prepare context
    const unique = Array.from(new Map(agg.map((r) => [r.chunk_id || `${r.document_id}-${(r.content || '').slice(0,32)}`, r])).values());
    const snippets = unique.slice(0, limit).map((r) => `Source: ${r.document_name}\n${(r.content || '').slice(0, 800)}`);
    const sources = unique.slice(0, limit).map((r) => r.document_name || 'Unknown');

    // Build strict JSON prompt
    const system = `You are Maturion. Output strictly valid JSON array only. No prose. No markdown. Schema: [{"domain_id":"uuid","intent_statement":"one concise sentence grounded in sources or best-practice if none","ai_suggested":true,"knowledge_base_used":true|false,"source_documents":["..."]}]. Return 1..3 intents maximum, each precise and non-generic.`;

    const contextBlock = snippets.length > 0 ? `CONTEXT for domain ${resolvedDomainName}:\n\n${snippets.join('\n\n')}` : '';
    const user = `${contextBlock}\n\nTask: Produce up to 3 domain intents for "${resolvedDomainName}". If no context, still return 1 solid best-practice intent and set knowledge_base_used=false. Domain ID: ${resolvedDomainId}`;

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 12000);
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        max_tokens: 450
      }),
      signal: ac.signal
    });
    clearTimeout(t);

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      throw new Error(`OpenAI error: ${openaiResp.status} ${errText}`);
    }

    const ai = await openaiResp.json();
    const raw: string = ai.choices?.[0]?.message?.content || '[]';

    const stripFences = (s: string) => s.replace(/^```json\n?|\n?```$/g, '').trim();
    const extractJSONArray = (s: string) => {
      const start = s.indexOf('[');
      const end = s.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end >= start) return s.slice(start, end + 1);
      return s;
    };

    let parsed: IntentOut[] = [];
    try {
      const cleaned = extractJSONArray(stripFences(raw));
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = [];
    }

    // Normalize and cap 3
    const intents: IntentOut[] = (parsed || []).slice(0, 3).map((it) => ({
      domain_id: resolvedDomainId,
      intent_statement: (it.intent_statement || '').trim(),
      ai_suggested: true,
      knowledge_base_used: !!(it.knowledge_base_used || sources.length > 0),
      source_documents: Array.isArray(it.source_documents) && it.source_documents.length ? it.source_documents : sources
    })).filter(x => x.intent_statement);

    // If nothing parsed, provide one best-practice fallback
    if (intents.length === 0) {
      intents.push({
        domain_id: resolvedDomainId,
        intent_statement: `Establish and maintain a robust ${resolvedDomainName} capability with clear ownership, cadence, and measurable outcomes.`,
        ai_suggested: true,
        knowledge_base_used: false,
        source_documents: []
      });
    }

    return new Response(JSON.stringify({ success: true, intents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('generate-intents-list error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});