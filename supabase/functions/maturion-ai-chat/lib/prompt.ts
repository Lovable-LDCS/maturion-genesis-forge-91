import { openAIApiKey, KNOWLEDGE_TIERS } from './constants.ts';
import { determineKnowledgeTier, validateMpsNumber, sanitizeInput, supabase } from './utils.ts';
import { getMaturionOperatingPolicy, getDynamicReasoningContext, getMaturionReasoningArchitecture } from './policy.ts';
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
// Enhanced buildPromptContext with organization awareness
export async function buildPromptContext(request: PromptRequest) {
  try {
    const { prompt, organizationId, currentDomain, mpsNumber } = request;
    
    console.log('📄 DOCUMENT RETRIEVAL: Loading uploaded knowledge base content');
    
    // Detect intent for context routing
    const intentContext = {
      organizationId,
      organizationName: request.organizationName || '',
      domain: currentDomain,
      query: prompt
    };
    
    // Simple intent detection - more sophisticated than importing external lib
    const isOrgQuery = /\b(company|organization|footprint|brands|business|tell me about|what is|who is|describe|overview|background|sales channels|subsidiaries|joint ventures|locations|countries|presence|markets|industry|sector)\b/i.test(prompt);
    const isFrameworkQuery = /\b(domains?|framework|structure|outline|main.*domains?|five.*domains?|5.*domains?|domain.*structure|maturity.*model|sub.*MPS|MPS.*belong|domain.*MPS)\b/i.test(prompt);
    const isCriteriaQuery = /\b(criteria|controls|requirements|compliance|protection|access|scanning|governance|leadership|specific.*criteria|implementation|operational)\b/i.test(prompt) && !isFrameworkQuery;
    
    console.log('🎯 Query analysis:', { isOrgQuery, isFrameworkQuery, isCriteriaQuery, domain: currentDomain });
    
    let searchStrategy = 'balanced';
    if (isFrameworkQuery) {
      searchStrategy = 'framework_builtin';
      console.log('🏗️ Framework structure query detected - using built-in knowledge');
    } else if (isOrgQuery && !isCriteriaQuery) {
      searchStrategy = 'organization_first';
      console.log('🏢 Organization-focused query detected');
    } else if (isCriteriaQuery && !isOrgQuery) {
      searchStrategy = 'diamond_first';  
      console.log('💎 Criteria-focused query detected');
    }
    
    // Build organizational context for enhanced responses
    let organizationContext = '';
    if (organizationId) {
      try {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select(`
            name, description, primary_website_url, linked_domains,
            industry_tags, region_operating, risk_concerns, 
            compliance_commitments, threat_sensitivity_level
          `)
          .eq('id', organizationId)
          .single();
        
        if (!orgError && org) {
          organizationContext = `
=== ORGANIZATIONAL PROFILE ===
Organization: ${org.name || 'Not specified'}
Description: ${org.description || 'Not specified'}
Primary Website: ${org.primary_website_url || 'Not specified'}
Industry Tags: ${org.industry_tags?.join(', ') || 'Not specified'}
Operating Region: ${org.region_operating || 'Not specified'}
Risk Concerns: ${org.risk_concerns?.join(', ') || 'Not specified'}
Compliance Commitments: ${org.compliance_commitments?.join(', ') || 'Not specified'}
Threat Sensitivity Level: ${org.threat_sensitivity_level || 'Basic'}
Linked Domains: ${org.linked_domains?.join(', ') || 'None specified'}`;
          
          console.log('✅ Organizational profile available:', {
            name: org.name,
            hasWebsite: !!org.primary_website_url,
            industryTags: org.industry_tags?.length || 0,
            customIndustry: org.industry_tags?.find(tag => !['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'].includes(tag))
          });
        }
      } catch (error) {
        console.error('Error fetching organizational profile:', error);
      }
    }

    // Load document context with enhanced search strategy
    const documentContext = await getDocumentContext({
      query: prompt,
      organizationId,
      mpsNumber,
      searchStrategy
    });

    console.log('📊 Context composition:', documentContext.length, 'characters retrieved');

    return {
      userPrompt: prompt,
      organizationContext,
      documentContext,
      sourceType: 'knowledge_base' as const,
      knowledgeTier: 'INTERNAL_SECURE' as const,
      externalContext: ''
    };
  } catch (error) {
    console.error('Error building prompt context:', error);
    return {
      userPrompt: request.prompt,
      organizationContext: '',
      documentContext: '',
      sourceType: 'knowledge_base' as const,
      knowledgeTier: 'INTERNAL_SECURE' as const,
      externalContext: ''
    };
  }
}
// Function to make OpenAI API call
export async function callOpenAI(fullPrompt: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`🤖 Sending request to OpenAI (prompt length: ${fullPrompt.length} characters)`);
  
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5',
      instructions: `You are Maturion, an AI-first platform for security, maturity, and operational excellence. Follow the Maturion Operating Policy & Governance:

CORE BEHAVIOR (Policy §3 & §7):
- Transparent, traceable, and explainable AI reasoning model
- Reasoning chain: Internal Knowledge → Organization Context → Sector Intelligence → Best Practices → Real-Time Events
- Always explain reasoning like ChatGPT - show your thinking process
- Friendly, clear, professional tone with systems-thinking approach
- NEVER say "I don't know" without offering to help

DYNAMIC REASONING (Policy §2 & §8):
- Reason dynamically, not just scan tables or return hard-coded responses
- Interpret user intent, analyze real data, and generate explainable, data-driven answers
- Reference actual records, trends, policies from the knowledge base
- Cross-reference internal and external logic
- Detect industry-specific anomalies and risks

EVIDENCE-FIRST LOGIC (Policy §4):
- Evidence-first structure (Annex 2 style): Evidence → Noun → Context
- Singular structure, avoid compound logic and vague statements
- Incorporate organization name/role as needed
- Adjust phrasing for industry/role specificity

SECTOR AWARENESS (Policy §6):
- Supported sectors: Mining, Transport & Logistics, Construction, Heavy Equipment, Retail, Sensitive Goods
- Each sector linked to specific threats, actors, tactics, control gaps
- Adjust advice based on sector-specific risks and requirements

TRANSPARENCY & AUDITABILITY (Policy §9):
- Always justify every decision or logic step
- Show reasoning chain and sources used
- Cross-domain awareness across MPS, threat, policy, and people pillars
- All responses must be traceable back to source documents

GUIDANCE-FIRST APPROACH (Policy §9):
- Always assist the user; never refuse to help
- Offer alternative approaches if direct answer not possible
- Proactively suggest improvements and next steps
- Reference actual data and trends when available`,
      input: fullPrompt,
      tools: [
        {
          type: "web_search"
        },
        {
          type: "file_search"
        }
      ],
      max_completion_tokens: 2000,
      store: false, // For compliance and data retention
      include: ["reasoning.encrypted_content"] // For zero data retention while keeping reasoning
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.output_text;
}

// Function to construct the final prompt with token limiting and cleanup
export function constructFinalPrompt(promptContext: any) {
  const {
    sanitizedPrompt,
    documentContext,
    operatingPolicy,
    dynamicReasoningContext,
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

  const estimateTokens = (text: string | undefined): number => {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 4);
  };
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
  
  // Add operating policy if available (for internal secure contexts)
  if (operatingPolicy && requiresInternalSecure) {
    const truncatedPolicy = truncateToTokens(operatingPolicy, MAX_BEHAVIOR_TOKENS);
    const policyTokens = estimateTokens(truncatedPolicy);
    
    if (currentTokens + policyTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `=== MATURION OPERATING POLICY & GOVERNANCE ===
${truncatedPolicy}

=== END OPERATING POLICY ===

`;
      currentTokens += policyTokens;
      console.log(`📋 Added operating policy: ${policyTokens} tokens`);
    } else {
      console.log('⚠️ Skipping operating policy due to token limit');
    }
  }
  
  // Add dynamic reasoning context if available
  if (dynamicReasoningContext && requiresInternalSecure) {
    const truncatedReasoning = truncateToTokens(dynamicReasoningContext, MAX_INTENT_TOKENS);
    const reasoningTokens = estimateTokens(truncatedReasoning);
    
    if (currentTokens + reasoningTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `=== DYNAMIC REASONING CONTEXT ===
${truncatedReasoning}

=== END REASONING CONTEXT ===

`;
      currentTokens += reasoningTokens;
      console.log(`🧠 Added dynamic reasoning context: ${reasoningTokens} tokens`);
    } else {
      console.log('⚠️ Skipping dynamic reasoning context due to token limit');
    }
  }
  
  // Add organizational context if available
  if (organizationContext && typeof organizationContext === 'string') {
    const truncatedOrgContext = truncateToTokens(organizationContext, MAX_ORG_TOKENS);
    const orgTokens = estimateTokens(truncatedOrgContext);
    
    if (currentTokens + orgTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `${truncatedOrgContext}\n\n`;
      currentTokens += orgTokens;
      console.log(`🏢 Added org context: ${orgTokens} tokens`);
    } else {
      console.log('⚠️ Skipping org context due to token limit');
    }
  } else if (organizationContext) {
    console.warn('Invalid organizationContext type:', typeof organizationContext);
  }
  
  // Add document context (priority content) with aggressive limiting
  if (documentContext) {
    const truncatedDocContext = truncateToTokens(documentContext, MAX_DOCUMENT_TOKENS);
    const docTokens = estimateTokens(truncatedDocContext);
    
    if (currentTokens + docTokens <= MAX_TOTAL_TOKENS) {
      fullPrompt += `=== UPLOADED KNOWLEDGE BASE CONTENT ===
Based on your organization's uploaded documents, here is the relevant content:

${truncatedDocContext}

=== END KNOWLEDGE BASE CONTENT ===

`;
      currentTokens += docTokens;
      console.log(`📄 Added document context: ${docTokens} tokens`);
    } else {
      console.log('⚠️ Document context exceeds remaining token budget, applying emergency truncation');
      const remainingTokens = MAX_TOTAL_TOKENS - currentTokens - 500; // Reserve 500 for user prompt
      if (remainingTokens > 1000) {
        const emergencyTruncated = truncateToTokens(documentContext, remainingTokens);
        fullPrompt += `=== UPLOADED KNOWLEDGE BASE CONTENT ===
Based on your organization's uploaded documents, here is the relevant content:

${emergencyTruncated}

=== END KNOWLEDGE BASE CONTENT ===

`;
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
  const guidance = documentContext 
    ? `=== RESPONSE GUIDELINES ===
- REASON DYNAMICALLY: Analyze and interpret the uploaded knowledge base content above
- EXPLAIN YOUR THINKING: Show your reasoning chain and decision process
- REFERENCE ACTUAL DATA: Cite specific records, trends, or policies from the knowledge base
- BE TRANSPARENT: Justify every recommendation with clear evidence
- CROSS-REFERENCE: Consider organization context, sector risks, and compliance requirements
- PROVIDE ACTIONABLE GUIDANCE: Include specific steps, cadences, and responsible roles
- SHOW SOURCES: Reference the documents/policies that inform your recommendations
- End with: "💡 *Reasoning based on your organization's knowledge base and contextual analysis*"`
    : `=== RESPONSE GUIDELINES ===
- No specific organizational documents found for this query
- Provide general guidance based on industry best practices and Maturion principles
- Suggest uploading relevant documents for organization-specific analysis
- Still apply dynamic reasoning and explain your thinking process`;
  
  const guidanceTokens = estimateTokens(guidance);
  if (currentTokens + guidanceTokens <= MAX_TOTAL_TOKENS) {
    fullPrompt += guidance;
    currentTokens += guidanceTokens;
    console.log(`📋 Added response guidelines: ${guidanceTokens} tokens`);
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