import { openAIApiKey, KNOWLEDGE_TIERS } from './constants.ts';
import { determineKnowledgeTier, validateMpsNumber, sanitizeInput } from './utils.ts';
import { getAIBehaviorPolicy, getIntentPromptLogic } from './policy.ts';
import { getDocumentContext } from './context.ts';
import { buildOrganizationalContext } from './organization.ts';
import { getExternalInsights } from './external.ts';

export interface PromptRequest {
  prompt: string;
  context?: string;
  currentDomain?: string;
  organizationId?: string;
  allowExternalContext?: boolean;
  knowledgeBaseUsed?: boolean;
  sourceDocuments?: any[];
  organizationProfile?: any;
  mpsNumber?: number;
}

// Function to build comprehensive prompt based on knowledge tier and context
export async function buildPromptContext(request: PromptRequest) {
  const {
    prompt,
    context,
    currentDomain,
    organizationId,
    allowExternalContext = false,
    mpsNumber
  } = request;

  // Sanitize inputs
  const sanitizedPrompt = sanitizeInput(prompt);
  const sanitizedContext = sanitizeInput(context || '');
  const validatedMpsNumber = validateMpsNumber(mpsNumber);
  
  console.log('📥 Request details:', {
    hasPrompt: !!sanitizedPrompt,
    context: sanitizedContext,
    domain: currentDomain,
    orgId: organizationId,
    hasOrgProfile: !!request.organizationProfile,
    sourceDocCount: request.sourceDocuments?.length || 0
  });

  // Determine knowledge tier and requirements
  const knowledgeTier = determineKnowledgeTier(sanitizedContext);
  const requiresInternalSecure = KNOWLEDGE_TIERS.INTERNAL_SECURE.some(keyword => 
    sanitizedContext.toLowerCase().includes(keyword.toLowerCase())
  );

  console.log(`🎯 Knowledge tier: ${knowledgeTier}, Requires internal secure: ${requiresInternalSecure}`);

  let documentContext = '';
  let behaviorPolicy = '';
  let intentPromptLogic = '';
  let organizationContext = '';
  let externalContext = '';
  let sourceType = 'general';

  // For organizational context, include profile data
  if (knowledgeTier === 'ORGANIZATIONAL_CONTEXT' && organizationId) {
    console.log('🎯 ORGANIZATIONAL CONTEXT MODE: Building comprehensive profile');
    organizationContext = await buildOrganizationalContext(organizationId);
  }

  // For Tier 1 (Internal Secure) contexts, enforce strict policy
  if (requiresInternalSecure && organizationId) {
    console.log('🔒 INTERNAL MODE: Enforcing AI Behavior & Knowledge Source Policy');
    
    // Get the policy documents first
    behaviorPolicy = await getAIBehaviorPolicy(organizationId);
    intentPromptLogic = await getIntentPromptLogic(organizationId);
    
    // Extract MPS number from prompt for targeted search (use passed parameter first)
    const extractedMpsNumber = validatedMpsNumber || (sanitizedPrompt.match(/MPS\s*(\d+)/i)?.[1] ? parseInt(sanitizedPrompt.match(/MPS\s*(\d+)/i)?.[1]) : undefined);
    
    console.log(`🎯 MPS targeting: ${extractedMpsNumber ? `MPS ${extractedMpsNumber}` : 'No specific MPS'}`);
    
    // Get document context for the specific request with MPS targeting
    documentContext = await getDocumentContext(organizationId, sanitizedPrompt, currentDomain, extractedMpsNumber);
    sourceType = 'internal';
    
    console.log(`Knowledge base context length: ${documentContext.length} characters`);
    console.log(`AI Behavior Policy found: ${behaviorPolicy.length > 0 ? 'Yes' : 'No'}`);
    console.log(`Intent Prompt Logic found: ${intentPromptLogic.length > 0 ? 'Yes' : 'No'}`);
    
    // Add organizational context for internal secure operations
    if (!organizationContext) {
      organizationContext = await buildOrganizationalContext(organizationId);
    }
  }

  // For external awareness contexts
  if (knowledgeTier === 'EXTERNAL_AWARENESS' && organizationId && allowExternalContext) {
    console.log('🌐 EXTERNAL AWARENESS MODE: Including threat intelligence');
    externalContext = await getExternalInsights(organizationId, sanitizedContext);
    sourceType = 'external';
  }

  return {
    sanitizedPrompt,
    documentContext,
    behaviorPolicy,
    intentPromptLogic,
    organizationContext,
    externalContext,
    sourceType,
    knowledgeTier,
    requiresInternalSecure
  };
}

// Function to make OpenAI API call
export async function callOpenAI(fullPrompt: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`🤖 Sending request to OpenAI (prompt length: ${fullPrompt.length} characters)`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are Maturion, an expert AI assistant specializing in enterprise security maturity assessment and compliance frameworks. You provide precise, actionable guidance based on uploaded knowledge base documents and organizational context.'
        },
        { role: 'user', content: fullPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent, focused responses
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Function to construct the final prompt
export function constructFinalPrompt(promptContext: any) {
  const {
    sanitizedPrompt,
    documentContext,
    behaviorPolicy,
    intentPromptLogic,
    organizationContext,
    externalContext,
    requiresInternalSecure
  } = promptContext;

  let fullPrompt = '';
  
  // Add behavior policy if available (for internal secure contexts)
  if (behaviorPolicy && requiresInternalSecure) {
    fullPrompt += `${behaviorPolicy}\n\n`;
  }
  
  // Add intent prompt logic if available
  if (intentPromptLogic && requiresInternalSecure) {
    fullPrompt += `${intentPromptLogic}\n\n`;
  }
  
  // Add organizational context if available
  if (organizationContext) {
    fullPrompt += `${organizationContext}\n\n`;
  }
  
  // Add document context (priority content)
  if (documentContext) {
    fullPrompt += `=== KNOWLEDGE BASE CONTEXT ===\n${documentContext}\n\n`;
  }
  
  // Add external context if available
  if (externalContext) {
    fullPrompt += `${externalContext}\n\n`;
  }
  
  // Add the user's prompt
  fullPrompt += `=== USER REQUEST ===\n${sanitizedPrompt}\n\n`;
  
  // Add guidance for responses
  if (requiresInternalSecure) {
    fullPrompt += `
=== RESPONSE GUIDELINES ===
- Base your response ONLY on the provided knowledge base content and organizational context
- Do not rely on general knowledge or external sources
- If the knowledge base doesn't contain sufficient information, state this clearly
- Maintain consistency with the AI Behavior Policy outlined above
- Provide specific, actionable guidance relevant to the organization's profile`;
  }

  return fullPrompt;
}