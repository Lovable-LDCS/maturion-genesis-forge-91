// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type GenRequest = {
  organizationId: string;
  domainName: string;
  max?: number; // desired cap per run (variable length)
};

type MPSOut = {
  number?: string | number; // optional; UI may auto-number
  title: string;
  intent: string;
  rationale?: string;
  source_document?: string;
  knowledge_base_used?: boolean;
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
    return new Response(null, { headers: { ...corsHeaders } });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        const body: GenRequest = await req.json();
    const { organizationId, domainName, max = 8 } = body;

    if (!organizationId || !domainName) {
      return new Response(JSON.stringify({ error: 'organizationId and domainName are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build context by querying broadly for the domain (not forced 1..5)
        const queries = [
      `${domainName} governance controls`,
      `${domainName} minimum performance standards`,
      `${domainName} audit requirements`,
      `${domainName} policy framework`,
      `${domainName} roles responsibilities accountability`,
    ];
    const agg: SAISearchResult[] = [];
    for (const q of queries) {
      try {
        const { data, error } = await supabase.functions.invoke('search-ai-context', {
          body: { query: q, organizationId, limit: 8, threshold: 0.2, documentTypes: ['mps','standard'] }
        });
        const d = data as { success?: boolean; results?: SAISearchResult[] } | null;
        if (!error && d?.results?.length) agg.push(...d.results);
      } catch (_e) { /* ignore */ }
    }
    const unique = Array.from(new Map(agg.map((r) => [r.chunk_id || `${r.document_id}-${(r.content || '').slice(0,32)}`, r])).values());
    const snippets = unique.slice(0, 10).map((r) => `Source: ${r.document_name}\n${(r.content || '').slice(0, 900)}`);
    const sources = unique.slice(0, 10).map((r) => r.document_name || 'Unknown');

    // Domain-specific guidance and avoidance list to prevent operational or KPI-only items for strategy/governance
    const dn = (domainName || '').toLowerCase();
    const avoidTerms = dn.includes('leadership') || dn.includes('governance')
      ? ['kpi','override','protocol','8-hour','watchdog','escalation','grid','playbook']
      : [];
    const domainAnchors = dn.includes('leadership') || dn.includes('governance')
      ? [
          'Governance Structure & Accountability',
          'Policy Framework & Compliance',
          'Separation of Duties & Conflict Management',
          'Risk Management & Monitoring Cadence',
          'Legal & Regulatory Alignment'
        ] : [];

    // Prompt for variable-length, clustered MPS (5..max) with standards anchors
    const system = `You are Maturion. Output strictly valid JSON array only. No prose. No markdown.
Schema: [{"title":"domain-appropriate, specific, professional","intent":"one concise sentence of purpose","rationale":"why this MPS matters","source_document":"top source title if any","knowledge_base_used":true|false}].
Rules:
- Prefer document-backed titles; include source_document when available.
- Cluster subcomponents under broader MPS where reasonable; aim for fewer, higher-quality MPS with richer criteria later.
- Avoid duplicates; normalize closely-related titles into one MPS.
- Avoid operational/escalation-only items and KPI/override-specific phrasing for strategy/governance domains.
- For Leadership & Governance, align with ISO 31000 and ISO 37301 principles.
- Return between 5 and ${Math.max(5, Math.min(15, max))} items depending on context quality.`;

    const user = `${snippets.length ? `CONTEXT for ${domainName}:\n\n${snippets.join('\n\n')}` : ''}\n\nTask: Propose a variable-length list of MPS for the domain "${domainName}". Favor consolidation (fewer, clearer MPS that can hold grouped criteria). If context is thin, still return at least 5 professional, domain-appropriate MPS and set knowledge_base_used=false.\n${domainAnchors.length ? `Preferred anchors to consider (not mandatory): ${domainAnchors.join('; ')}` : ''}\n${avoidTerms.length ? `Avoid terms/concepts: ${avoidTerms.join(', ')}` : ''}`;

        // Call OpenAI with graceful fallback (never 500 the function on model errors)
    let content: string = '[]';
    try {
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
          temperature: 0.3,
          max_tokens: 700
        })
      });

      if (openaiResp.ok) {
        const ai = await openaiResp.json();
        content = ai.choices?.[0]?.message?.content || '[]';
      } else {
        const errText = await openaiResp.text();
        console.warn('OpenAI non-OK response:', openaiResp.status, errText);
      }
    } catch (e) {
      console.warn('OpenAI request failed, using fallback list:', e);
    }

    let parsed: MPSOut[] = [];
    try {
      const clean = content.replace(/^```json\n?|\n?```$/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = [];
    }

    // Deduplicate by normalized title and cap to max
    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const seen = new Set<string>();
    const deduped: MPSOut[] = [];
        for (const item of parsed || []) {
      const key = norm(item.title || '');
      if (!key || seen.has(key)) continue;
      // Filter out avoided terms for governance-like domains
      if (avoidTerms.some(t => key.includes(t))) continue;
      seen.add(key);
      deduped.push({
        title: (item.title || '').trim(),
        intent: (item.intent || '').trim(),
        rationale: item.rationale?.trim(),
        source_document: item.source_document,
        knowledge_base_used: !!(item.knowledge_base_used || sources.length > 0)
      });
      if (deduped.length >= Math.max(5, Math.min(15, max))) break;
    }

    // Fallback: if none parsed, create sensible defaults (5)
    if (deduped.length === 0) {
      deduped.push(
        { title: `${domainName}: Governance Structure & Accountability`, intent: 'Define roles, responsibilities, and oversight.', rationale: 'Clear governance enables accountability and control.', knowledge_base_used: false },
        { title: `${domainName}: Policy Framework & Compliance`, intent: 'Maintain a policy hierarchy aligned to obligations.', rationale: 'Policies translate obligations into actionable controls.', knowledge_base_used: false },
        { title: `${domainName}: Separation of Duties`, intent: 'Prevent conflicts through appropriate segregation and checks.', rationale: 'Reduces risk of fraud and misuse.', knowledge_base_used: false },
        { title: `${domainName}: Risk Assessment & Monitoring`, intent: 'Identify, assess, and monitor risks with defined cadence.', rationale: 'Sustains visibility and response.', knowledge_base_used: false },
        { title: `${domainName}: Legal & Regulatory Alignment`, intent: 'Track and enforce compliance across the organization.', rationale: 'Compliance is a baseline requirement.', knowledge_base_used: false }
      );
    }

    return new Response(JSON.stringify({ success: true, mps: deduped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
      } catch (err) {
    console.error('generate-mps-list error:', err);
    // Return a safe fallback (5 baseline MPS) instead of 500 to avoid breaking UI
    const fallback = [
      { title: `${'Governance Structure & Accountability'}`, intent: 'Define governance bodies, roles, and decision rights for oversight.', rationale: 'Clear governance enables accountability and effective control.', knowledge_base_used: false },
      { title: `${'Policy Framework & Compliance'}`, intent: 'Maintain a policy hierarchy aligned to legal and regulatory requirements.', rationale: 'Policies translate obligations into actionable controls.', knowledge_base_used: false },
      { title: `${'Separation of Duties'}`, intent: 'Prevent conflicts and concentration of authority through appropriate segregation and checks.', rationale: 'Reduces risk of fraud and misuse.', knowledge_base_used: false },
      { title: `${'Risk Management & Monitoring Cadence'}`, intent: 'Identify, assess, and monitor risks with a defined cadence.', rationale: 'Sustains visibility and response.', knowledge_base_used: false },
      { title: `${'Legal & Regulatory Alignment'}`, intent: 'Track and enforce compliance across the organization.', rationale: 'Compliance is a baseline requirement for operations.', knowledge_base_used: false }
    ];
    return new Response(JSON.stringify({ success: true, mps: fallback, thin_context: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});