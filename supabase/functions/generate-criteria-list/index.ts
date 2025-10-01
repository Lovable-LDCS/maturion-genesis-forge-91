import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GenRequest = {
  organizationId: string;
  mpsId?: string;
  domainId?: string;
  max?: number; // cap variable-length
};

type CriteriaOut = {
  criteria_number: string; // e.g., "3.1"
  statement: string;
  summary?: string;
  suggested_maturity_levels?: { level: string; descriptor: string }[];
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
    const { organizationId, mpsId, domainId, max = 12 } = body || {};

    if (!organizationId || (!mpsId && !domainId)) {
      return new Response(JSON.stringify({ error: 'organizationId and (mpsId or domainId) are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve domain name if needed
    let resolvedDomainName = '';
    if (domainId) {
      const { data: drow } = await supabase.from('domains').select('name').eq('id', domainId).maybeSingle();
      resolvedDomainName = drow?.name || '';
    } else if (mpsId) {
      const { data: mpsRow } = await supabase.from('maturity_practice_statements').select('domain_id').eq('id', mpsId).maybeSingle();
      if (mpsRow?.domain_id) {
        const { data: drow } = await supabase.from('domains').select('name').eq('id', mpsRow.domain_id).maybeSingle();
        resolvedDomainName = drow?.name || '';
      }
    }

    const queriesBase = [
      `${resolvedDomainName} criteria`,
      `${resolvedDomainName} audit requirements`,
      `${resolvedDomainName} control requirements`,
    ];

    const agg: SAISearchResult[] = [];
    for (const q of queriesBase) {
      try {
        const { data, error } = await supabase.functions.invoke('search-ai-context', {
          body: { query: q, organizationId, limit: Math.min(max, 20), threshold: 0.2 }
        });
        const d = data as { success?: boolean; results?: SAISearchResult[] } | null;
        if (!error && d?.results?.length) agg.push(...d.results);
      } catch (_) { /* ignore */ }
    }

    const unique = Array.from(new Map(agg.map((r) => [r.chunk_id || `${r.document_id}-${(r.content || '').slice(0,32)}`, r])).values());
    const snippets = unique.slice(0, Math.min(max, 10)).map((r) => `Source: ${r.document_name}\n${(r.content || '').slice(0, 900)}`);
    const sources = unique.slice(0, Math.min(max, 10)).map((r) => r.document_name || 'Unknown');

    const system = `You are Maturion. Output strictly valid JSON array only. No prose. No markdown. Schema: [{"criteria_number":"X.Y","statement":"clear requirement","summary":"optional concise summary","suggested_maturity_levels":[{"level":"initial|managed|defined|quantitatively_managed|optimizing","descriptor":"short"}],"knowledge_base_used":true|false,"source_documents":["..."]}]. Return variable length 2..50 depending on context quality.`;

    const user = `${snippets.length ? `CONTEXT for ${resolvedDomainName}:\n\n${snippets.join('\n\n')}` : ''}\n\nTask: Produce a variable-length list of evaluation criteria ${(mpsId ? `for the selected MPS (${mpsId})` : `for the ${resolvedDomainName} domain`)} grounded in provided sources. If context is thin, still return at least 2 generic but professional criteria and set knowledge_base_used=false.`;

    // Add a 15s timeout for OpenAI call
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);
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
        max_tokens: Math.min(900, 1200)
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

    // Robust JSON extraction: strip fences and non-JSON wrapper text
    const stripFences = (s: string) => s.replace(/^```json\n?|\n?```$/g, '').trim();
    const extractJSONArray = (s: string) => {
      const start = s.indexOf('[');
      const end = s.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end >= start) return s.slice(start, end + 1);
      return s;
    };

    let parsed: CriteriaOut[] = [];
    try {
      const cleaned = extractJSONArray(stripFences(raw));
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = [];
    }

    const normalized: CriteriaOut[] = (parsed || []).map((c, i) => ({
      criteria_number: c.criteria_number || `${i + 1}`,
      statement: (c.statement || '').trim(),
      summary: c.summary?.trim(),
      suggested_maturity_levels: Array.isArray(c.suggested_maturity_levels) ? c.suggested_maturity_levels : undefined,
      knowledge_base_used: !!(c.knowledge_base_used || sources.length > 0),
      source_documents: Array.isArray(c.source_documents) && c.source_documents.length ? c.source_documents : sources
    })).filter(x => x.statement);

    // Fallback minimum: at least 2
    while (normalized.length < 2) {
      normalized.push({
        criteria_number: `${normalized.length + 1}`,
        statement: `Establish and document ${resolvedDomainName || 'domain'} procedures with clear ownership and review cadence.`,
        summary: `Baseline requirement for ${resolvedDomainName || 'domain'} governance`,
        knowledge_base_used: false,
        source_documents: []
      });
    }

    // Cap to max if necessary
    const result = normalized.slice(0, max);

    // Gap heuristic: if sources empty and count small, recommend gap followup (UI will decide)
    const thin = sources.length === 0 && result.length <= 3;

    return new Response(JSON.stringify({ success: true, criteria: result, thin_context: thin }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('generate-criteria-list error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});