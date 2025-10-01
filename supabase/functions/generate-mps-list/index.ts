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
};

type MPSOut = {
  number: string;
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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body: GenRequest = await req.json();
    const { organizationId, domainName } = body;

    if (!organizationId || !domainName) {
      return new Response(JSON.stringify({ error: 'organizationId and domainName are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch targeted context per MPS number 1..5
        const expected = ['1','2','3','4','5'];
    const perMpsContext: Record<string, { snippets: string[]; sources: string[] }> = {};

    for (const num of expected) {
      const queries = [
        `${domainName} MPS ${num}`,
        `MPS ${num} ${domainName}`,
        `Mini Performance Standard ${num} ${domainName}`,
      ];
      const agg: SAISearchResult[] = [];
      for (const q of queries) {
        try {
          const { data, error } = await supabase.functions.invoke('search-ai-context', {
            body: { query: q, organizationId, limit: 6, threshold: 0.2, mpsNumber: Number(num) }
          });
          const d = data as { success?: boolean; results?: SAISearchResult[] } | null;
          if (!error && d?.results?.length) agg.push(...d.results);
        } catch (_e) { /* ignore */ }
      }
      // Dedup by chunk id
      const unique = Array.from(new Map(agg.map((r) => [r.chunk_id || `${r.document_id}-${(r.content || '').slice(0,32)}`, r])).values());
      const snippets = unique.slice(0, 4).map((r) => `Source: ${r.document_name}\n${(r.content || '').slice(0, 800)}`);
      const sources = unique.slice(0, 4).map((r) => r.document_name || 'Unknown');
      perMpsContext[num] = { snippets, sources };
    }

    // Build prompt that enforces strict JSON
    const contextBlocks = expected.map(n => {
      const c = perMpsContext[n];
      const block = c && c.snippets.length > 0 ? c.snippets.join('\n\n') : '';
      return `MPS ${n} Context:\n${block}`;
    }).join('\n\n-----\n\n');

    const system = `You are Maturion. Output strictly valid JSON array only. No prose. No markdown.
Schema: [{"number":"1-5","title":"domain-appropriate, specific, professional","intent":"one concise sentence of purpose","rationale":"why this MPS matters","source_document":"top source title if any","knowledge_base_used":true|false}].
Rules:
- Prefer document-backed titles; include source_document when available.
- If no document context, use best-practice domain-appropriate titles (no placeholders like 'KPI & Override Checks').
- Titles must be clear, action-oriented, and aligned to the domain.
- Always include all numbers 1..5.`;

    const user = `${contextBlocks}\n\nTask: Produce MPS 1..5 for domain "${domainName}" grounded in the provided organization documents where possible. If no context, still output all 5 using best-practice domain-appropriate titles and set knowledge_base_used=false.`;

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

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      throw new Error(`OpenAI error: ${openaiResp.status} ${errText}`);
    }

    const ai = await openaiResp.json();
    const content: string = ai.choices?.[0]?.message?.content || '[]';

    let parsed: MPSOut[] = [];
    try {
      const clean = content.replace(/^```json\n?|\n?```$/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = [];
    }

        // Ensure 1..5 present; fill missing with best-practice fallbacks (domain-aware)
    const defaultsForDomain = (dn: string): Record<string, MPSOut> => {
      const lower = (dn || '').toLowerCase();
      if (lower.includes('leadership') || lower.includes('governance')) {
        return {
          '1': { number: '1', title: 'Governance Structure & Accountability', intent: 'Define governance bodies, roles, and decision rights for oversight.', rationale: 'Clear governance enables accountability and effective control.', knowledge_base_used: false },
          '2': { number: '2', title: 'Policy Framework & Compliance Alignment', intent: 'Maintain a policy hierarchy aligned to legal and regulatory requirements.', rationale: 'Policies translate obligations into actionable controls.', knowledge_base_used: false },
          '3': { number: '3', title: 'Separation of Duties & Conflict Management', intent: 'Prevent conflicts and concentration of authority through SoD and checks.', rationale: 'Reduces fraud risk and enforces proper authorization.', knowledge_base_used: false },
          '4': { number: '4', title: 'Risk & Control Monitoring Cadence', intent: 'Establish defined cadence for risk reviews, control testing, and reporting.', rationale: 'Regular cadence sustains risk visibility and response.', knowledge_base_used: false },
          '5': { number: '5', title: 'Legal & Regulatory Adherence Governance', intent: 'Track, evaluate, and enforce compliance across the organization.', rationale: 'Compliance is a baseline requirement for operations.', knowledge_base_used: false },
        };
      }
      // Generic best-practice fallbacks
      return {
        '1': { number: '1', title: 'Leadership & Accountability', intent: 'Establish leadership roles and accountability for outcomes.', rationale: 'Leadership anchors performance and compliance.', knowledge_base_used: false },
        '2': { number: '2', title: 'Process Ownership & Controls', intent: 'Assign process ownership and implement effective control points.', rationale: 'Ownership and controls improve reliability.', knowledge_base_used: false },
        '3': { number: '3', title: 'Segregation of Duties', intent: 'Separate critical functions to reduce conflicts and misuse.', rationale: 'SoD reduces conflict-of-interest and fraud risk.', knowledge_base_used: false },
        '4': { number: '4', title: 'Risk Assessment & Mitigation', intent: 'Identify, assess, and mitigate key risks with defined cadence.', rationale: 'Systematic risk management boosts resilience.', knowledge_base_used: false },
        '5': { number: '5', title: 'Regulatory & Policy Compliance', intent: 'Align operations to legal, regulatory and internal policy requirements.', rationale: 'Mandatory baseline for operations.', knowledge_base_used: false },
      };
    };

    const bp = defaultsForDomain(domainName);


    const byNum = new Map<string, MPSOut>();
    for (const item of parsed) {
      if (item?.number && ['1','2','3','4','5'].includes(String(item.number))) {
        const n = String(item.number);
        byNum.set(n, {
          number: n,
          title: item.title || bp[n].title,
          intent: item.intent || bp[n].intent,
          rationale: item.rationale,
          source_document: item.source_document,
          knowledge_base_used: item.knowledge_base_used ?? !!item.source_document
        });
      }
    }

    for (const n of expected) if (!byNum.has(n)) byNum.set(n, bp[n]);

    const result = Array.from(byNum.entries()).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([,v]) => v);

    return new Response(JSON.stringify({ success: true, mps: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    } catch (err) {
    console.error('generate-mps-list error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});