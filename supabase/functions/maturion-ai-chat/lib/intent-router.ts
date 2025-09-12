// Intent routing for organization-aware chat responses
export interface IntentContext {
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  query: string;
}

export type IntentType = 'organization_overview' | 'maturity_criteria' | 'general';

export function detectIntent(context: IntentContext): IntentType {
  const query = context.query.toLowerCase();
  
  // Organization-specific questions
  const orgKeywords = [
    'company', 'organization', 'footprint', 'brands', 'business', 'operations',
    'tell me about', 'what is', 'who is', 'describe', 'overview', 'background',
    'sales channels', 'subsidiaries', 'joint ventures', 'jv', 'partnerships',
    'locations', 'countries', 'presence', 'markets', 'industry', 'sector'
  ];
  
  // Maturity/criteria questions  
  const maturityKeywords = [
    'criteria', 'controls', 'maturity', 'requirements', 'compliance',
    'give me', 'list', 'provide', '~10', 'protection', 'access', 'scanning',
    'governance', 'leadership', 'process integrity', 'proof it works'
  ];
  
  // Check for organization-specific intent
  if (orgKeywords.some(keyword => query.includes(keyword))) {
    return 'organization_overview';
  }
  
  // Check for maturity/criteria intent
  if (maturityKeywords.some(keyword => query.includes(keyword))) {
    return 'maturity_criteria';
  }
  
  return 'general';
}

export function buildIntentPrompt(intent: IntentType, context: IntentContext): string {
  const orgName = context.organizationName || 'the organization';
  
  switch (intent) {
    case 'organization_overview':
      return `Provide a comprehensive overview of ${orgName} as a company. Include:
- Business overview and primary operations
- Geographic footprint and key locations  
- Major brands, subsidiaries, or joint ventures
- Sales channels and market presence
- Key business segments or divisions

Focus on factual business information. Do NOT provide maturity criteria or security controls.`;

    case 'maturity_criteria':
      return `Generate diamond industry-specific maturity criteria for ${context.domain || 'the requested domain'}. 
Focus on practical, measurable requirements with:
- Clear requirement statements with owners and cadences
- Diamond-specific terminology (vault, black-screen, test stones, dual custody, etc.)
- Technology-first controls and defense-in-depth approaches
- Specific to diamond mining, processing, and retail operations`;

    default:
      return context.query;
  }
}

export function getDocumentPriority(intent: IntentType): {
  preferredTypes: string[];
  searchStrategy: 'organization_first' | 'diamond_first' | 'balanced';
} {
  switch (intent) {
    case 'organization_overview':
      return {
        preferredTypes: ['organization-profile', 'general', 'company_overview'],
        searchStrategy: 'organization_first'
      };
      
    case 'maturity_criteria':
      return {
        preferredTypes: ['diamond-specific', 'industry-priority', 'mps_document'],
        searchStrategy: 'diamond_first'
      };
      
    default:
      return {
        preferredTypes: ['mps_document', 'general'],
        searchStrategy: 'balanced'
      };
  }
}