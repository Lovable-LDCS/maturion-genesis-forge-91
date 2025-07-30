import { openAIApiKey, KNOWLEDGE_TIERS } from './constants.ts';
import { determineKnowledgeTier, validateMpsNumber, sanitizeInput, supabase } from './utils.ts';
import { getAIBehaviorPolicy, getIntentPromptLogic, getMaturionReasoningArchitecture } from './policy.ts';
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

  // Ensure we're using a primary organization (if not specified, try to get user's primary)
  let finalOrgId = organizationId;
  if (!finalOrgId) {
    console.log('⚠️ No organization specified in request, attempting to get primary org');
    const { data: primaryOrgId, error: orgError } = await supabase
      .rpc('get_user_primary_organization');
    
    if (!orgError && primaryOrgId) {
      finalOrgId = primaryOrgId;
      console.log('✅ Using primary organization:', finalOrgId);
    } else {
      console.warn('❌ Could not determine primary organization');
    }
  } else {
    // Validate the provided org is primary
    const { data: isPrimary, error: validateError } = await supabase
      .rpc('is_primary_organization', { org_uuid: organizationId });
    
    if (!validateError && !isPrimary) {
      console.log('⚠️ Provided organization is not primary, switching to primary org');
      const { data: primaryOrgId, error: orgError } = await supabase
        .rpc('get_user_primary_organization');
      
      if (!orgError && primaryOrgId) {
        finalOrgId = primaryOrgId;
        console.log('✅ Switched to primary organization:', finalOrgId);
      }
    }
  }
  
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
  let maturionReasoningArchitecture = '';
  let organizationContext = '';
  let externalContext = '';
  let sourceType = 'general';

  // For organizational context, include profile data
  if (knowledgeTier === 'ORGANIZATIONAL_CONTEXT' && finalOrgId) {
    console.log('🎯 ORGANIZATIONAL CONTEXT MODE: Building comprehensive profile');
    organizationContext = await buildOrganizationalContext(finalOrgId);
  }

  // 🧠 PLATFORM ANCHOR LOGIC: Always load Maturion Reasoning Architecture for ALL contexts
  if (finalOrgId) {
    console.log('🧠 Loading Platform Anchor Logic - Maturion Reasoning Architecture');
    maturionReasoningArchitecture = await getMaturionReasoningArchitecture(finalOrgId);
  }

  // For Tier 1 (Internal Secure) contexts, enforce strict policy
  if (requiresInternalSecure && finalOrgId) {
    console.log('🔒 INTERNAL MODE: Enforcing AI Behavior & Knowledge Source Policy');
    
    // Get the policy documents first
    behaviorPolicy = await getAIBehaviorPolicy(finalOrgId);
    intentPromptLogic = await getIntentPromptLogic(finalOrgId);
    
    // Extract MPS number from prompt for targeted search (use passed parameter first)
    const extractedMpsNumber = validatedMpsNumber || (sanitizedPrompt.match(/MPS\s*(\d+)/i)?.[1] ? parseInt(sanitizedPrompt.match(/MPS\s*(\d+)/i)?.[1]) : undefined);
    
    console.log(`🎯 MPS targeting: ${extractedMpsNumber ? `MPS ${extractedMpsNumber}` : 'No specific MPS'}`);
    
    // Get document context for the specific request with MPS targeting
    documentContext = await getDocumentContext(finalOrgId, sanitizedPrompt, currentDomain, extractedMpsNumber);
    sourceType = 'internal';
    
    console.log(`Knowledge base context length: ${documentContext.length} characters`);
    console.log(`AI Behavior Policy found: ${behaviorPolicy.length > 0 ? 'Yes' : 'No'}`);
    console.log(`Intent Prompt Logic found: ${intentPromptLogic.length > 0 ? 'Yes' : 'No'}`);
    
    // Add organizational context for internal secure operations
    if (!organizationContext) {
      organizationContext = await buildOrganizationalContext(finalOrgId);
    }
  }

  // For external awareness contexts
  if (knowledgeTier === 'EXTERNAL_AWARENESS' && finalOrgId && allowExternalContext) {
    console.log('🌐 EXTERNAL AWARENESS MODE: Including threat intelligence');
    externalContext = await getExternalInsights(finalOrgId, sanitizedContext);
    sourceType = 'external';
  }

  return {
    sanitizedPrompt,
    documentContext,
    behaviorPolicy,
    intentPromptLogic,
    maturionReasoningArchitecture,
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

// Function to construct the final prompt with token limiting and cleanup
export function constructFinalPrompt(promptContext: any) {
  const {
    sanitizedPrompt,
    documentContext,
    behaviorPolicy,
    intentPromptLogic,
    maturionReasoningArchitecture,
    organizationContext,
    externalContext,
    requiresInternalSecure
  } = promptContext;

  // Token limits for final assembly
  const MAX_TOTAL_TOKENS = 10000; // Reserve 2000 tokens for OpenAI response
  const MAX_DOCUMENT_TOKENS = 5500; // Reduced to make room for anchor logic
  const MAX_REASONING_TOKENS = 1200; // 🧠 PLATFORM ANCHOR LOGIC gets priority
  const MAX_BEHAVIOR_TOKENS = 800;
  const MAX_INTENT_TOKENS = 600;
  const MAX_ORG_TOKENS = 500;
  const MAX_EXTERNAL_TOKENS = 400;

  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
  const truncateToTokens = (text: string, maxTokens: number): string => {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '\n...[TRUNCATED DUE TO TOKEN LIMIT]';
  };

  let fullPrompt = '';
  let currentTokens = 0;
  
  console.log('🔢 Starting prompt construction with token limits...');
  
  // 🧠 HIGHEST PRIORITY: Add Maturion Reasoning Architecture (Platform Anchor Logic)
  if (maturionReasoningArchitecture) {
    const truncatedReasoning = truncateToTokens(maturionReasoningArchitecture, MAX_REASONING_TOKENS);
    const reasoningTokens = estimateTokens(truncatedReasoning);
    
    fullPrompt += `=== 🧠 PLATFORM ANCHOR LOGIC: MATURION REASONING ARCHITECTURE ===
${truncatedReasoning}

=== END PLATFORM ANCHOR LOGIC ===

`;
    currentTokens += reasoningTokens;
    console.log(`🧠 Added Platform Anchor Logic: ${reasoningTokens} tokens`);
  }
  
  // Add behavior policy if available (for internal secure contexts)
  if (behaviorPolicy && requiresInternalSecure) {
    const truncatedPolicy = truncateToTokens(behaviorPolicy, MAX_BEHAVIOR_TOKENS);
    const policyTokens = estimateTokens(truncatedPolicy);
    
    if (currentTokens + policyTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `${truncatedPolicy}\n\n`;
      currentTokens += policyTokens;
      console.log(`📋 Added behavior policy: ${policyTokens} tokens`);
    } else {
      console.log('⚠️ Skipping behavior policy due to token limit');
    }
  }
  
  // Add intent prompt logic if available
  if (intentPromptLogic && requiresInternalSecure) {
    const truncatedIntent = truncateToTokens(intentPromptLogic, MAX_INTENT_TOKENS);
    const intentTokens = estimateTokens(truncatedIntent);
    
    if (currentTokens + intentTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `${truncatedIntent}\n\n`;
      currentTokens += intentTokens;
      console.log(`🎯 Added intent logic: ${intentTokens} tokens`);
    } else {
      console.log('⚠️ Skipping intent logic due to token limit');
    }
  }
  
  // Add organizational context if available
  if (organizationContext) {
    const truncatedOrgContext = truncateToTokens(organizationContext, MAX_ORG_TOKENS);
    const orgTokens = estimateTokens(truncatedOrgContext);
    
    if (currentTokens + orgTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `${truncatedOrgContext}\n\n`;
      currentTokens += orgTokens;
      console.log(`🏢 Added org context: ${orgTokens} tokens`);
    } else {
      console.log('⚠️ Skipping org context due to token limit');
    }
  }
  
  // Add document context (priority content) with aggressive limiting
  if (documentContext) {
    const truncatedDocContext = truncateToTokens(documentContext, MAX_DOCUMENT_TOKENS);
    const docTokens = estimateTokens(truncatedDocContext);
    
    if (currentTokens + docTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `=== ACTUAL MPS DOCUMENT CONTENT ===\n${truncatedDocContext}\n\n`;
      currentTokens += docTokens;
      console.log(`📄 Added document context: ${docTokens} tokens`);
    } else {
      console.log('⚠️ Document context exceeds remaining token budget, applying emergency truncation');
      const remainingTokens = MAX_TOTAL_TOKENS - currentTokens - 500; // Reserve 500 for user prompt
      if (remainingTokens > 1000) {
        const emergencyTruncated = truncateToTokens(documentContext, remainingTokens);
        fullPrompt += `=== ACTUAL MPS DOCUMENT CONTENT ===\n${emergencyTruncated}\n\n`;
        currentTokens += estimateTokens(emergencyTruncated);
        console.log(`🚨 Emergency truncated document context: ${estimateTokens(emergencyTruncated)} tokens`);
      } else {
        console.log('❌ No room for document context - skipping');
      }
    }
  }
  
  // Add external context if available and space permits
  if (externalContext && currentTokens < MAX_TOTAL_TOKENS * 0.8) {
    const truncatedExternal = truncateToTokens(externalContext, MAX_EXTERNAL_TOKENS);
    const externalTokens = estimateTokens(truncatedExternal);
    
    if (currentTokens + externalTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `${truncatedExternal}\n\n`;
      currentTokens += externalTokens;
      console.log(`🌐 Added external context: ${externalTokens} tokens`);
    }
  }
  
  // Add the user's prompt
  const userPromptTokens = estimateTokens(sanitizedPrompt);
  fullPrompt += `=== USER REQUEST ===\n${sanitizedPrompt}\n\n`;
  currentTokens += userPromptTokens;
  console.log(`👤 Added user prompt: ${userPromptTokens} tokens`);
  
  // Add guidance for responses (keep minimal)
  if (requiresInternalSecure) {
    const guidance = `=== RESPONSE GUIDELINES ===
- Base response ONLY on provided knowledge base content
- If insufficient information, state this clearly
- Provide specific, actionable guidance`;
    
    const guidanceTokens = estimateTokens(guidance);
    if (currentTokens + guidanceTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += guidance;
      currentTokens += guidanceTokens;
      console.log(`📋 Added response guidelines: ${guidanceTokens} tokens`);
    }
  }

  console.log(`🔢 Pre-cleanup prompt: ${currentTokens} tokens (${fullPrompt.length} chars)`);

  // CRITICAL: Final cleanup step to remove placeholder patterns
  const cleanedPrompt = cleanupPrompt(fullPrompt);
  const finalTokens = estimateTokens(cleanedPrompt);
  
  console.log(`✅ Final prompt after cleanup: ${finalTokens} tokens (${cleanedPrompt.length} chars)`);
  
  if (finalTokens > 12000) {
    console.error(`🚨 FINAL PROMPT STILL EXCEEDS TOKEN LIMIT: ${finalTokens} > 12000`);
    // Emergency final truncation
    return cleanedPrompt.substring(0, 12000 * 4) + '\n...[EMERGENCY TRUNCATION]';
  }

  return cleanedPrompt;
}

// Final cleanup function to remove all placeholder patterns
function cleanupPrompt(prompt: string): string {
  console.log('🧹 Starting final prompt cleanup...');
  
  let cleaned = prompt;
  
  // Remove placeholder patterns that might have slipped through
  const placeholderPatterns = [
    /\[document_type\]/gi,
    /\[action_verb\]/gi,
    /\[requirement\]/gi,
    /\[specific_[a-z_]+\]/gi,
    /\bCriterion\s+[A-Z](?=\s*$|\s*\.|\s*,)/gi,
    /\bCriterion\s+[0-9]+(?=\s*$|\s*\.|\s*,)/gi,
    /\bAssessment criterion\b/gi,
    /\bTBD\b/gi,
    /\bTODO\b/gi,
    /\[PLACEHOLDER[^\]]*\]/gi
  ];
  
  const originalLength = cleaned.length;
  
  placeholderPatterns.forEach((pattern, index) => {
    const matches = cleaned.match(pattern);
    if (matches) {
      console.log(`🔍 Found ${matches.length} matches for pattern ${index + 1}: ${pattern.source}`);
      console.log(`   Examples: ${matches.slice(0, 3).join(', ')}`);
      cleaned = cleaned.replace(pattern, '[PLACEHOLDER_REMOVED]');
    }
  });
  
  // Remove multiple consecutive placeholder removals
  cleaned = cleaned.replace(/(\[PLACEHOLDER_REMOVED\]\s*){2,}/g, '[PLACEHOLDER_REMOVED]');
  
  // Clean up any remaining placeholder artifacts
  cleaned = cleaned.replace(/\[PLACEHOLDER_REMOVED\]/g, '');
  
  const finalLength = cleaned.length;
  if (finalLength !== originalLength) {
    console.log(`🧹 Cleanup removed ${originalLength - finalLength} characters`);
  } else {
    console.log('✅ No placeholder patterns found during cleanup');
  }
  
  return cleaned.trim();
}