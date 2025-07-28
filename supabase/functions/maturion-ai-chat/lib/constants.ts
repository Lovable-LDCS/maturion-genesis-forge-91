export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Three-tiered knowledge model per AI Behavior & Knowledge Source Policy v2.0
export const KNOWLEDGE_TIERS = {
  // Tier 1: Internal Secure Knowledge Base - STRICT enforcement for audit/compliance
  INTERNAL_SECURE: [
    'MPS generation', 'Intent statement generation', 'Criteria development',
    'Audit structure', 'Maturity level assessment', 'Compliance scoring',
    'Roadmap progression', 'Domain content creation', 'Maturity framework development',
    'evidence', 'scoring', 'compliance'
  ],
  
  // Tier 2: Organizational Context Layer - For tailoring to user context
  ORGANIZATIONAL_CONTEXT: [
    'organization', 'structure', 'size', 'roles', 'departments', 'team',
    'onboarding', 'metadata', 'context', 'tailoring'
  ],
  
  // Tier 3: External Awareness Layer - NEW: For threat detection and situational awareness
  EXTERNAL_AWARENESS: [
    'threat', 'risk horizon', 'industry threat', 'surveillance', 'awareness',
    'threat detection', 'emerging threat', 'situational awareness', 'risk intelligence',
    'threat trend', 'insider threat', 'diamond sector', 'threat alert'
  ]
};

// Environment variables
export const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
export const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
export const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;