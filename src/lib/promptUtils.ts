/**
 * Utility functions for AI prompt generation and validation
 * CRITICAL: This is the ONLY place for prompt logic - no duplication allowed
 */

export interface MPSContext {
  mpsId: string;
  mpsNumber: number;
  mpsTitle: string;
  domainId: string;
  organizationId: string;
}

export interface OrganizationContext {
  id: string;
  name: string;
  industry_tags: string[];
  region_operating: string;
  compliance_commitments: string[];
  custom_industry: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validCriteria: any[];
  hasAnnex1Fallback: boolean;
  hasPlaceholders: boolean;
  hasEvidenceFirstViolations: boolean;
}

/**
 * CRITICAL: Hard block for Annex 1 fallback detection
 * This is the primary defense against wrong document usage
 */
export const detectAnnex1Fallback = (content: string, mpsNumber: number): boolean => {
  if (mpsNumber === 1) return false; // Allow Annex 1 only for MPS 1
  
  const annex1Indicators = [
    'annex 1',
    'annex i',
    'leadership and governance',
    'governance framework',
    'board oversight',
    'strategic planning'
  ];
  
  const contentLower = content.toLowerCase();
  return annex1Indicators.some(indicator => contentLower.includes(indicator));
};

/**
 * SINGLE SOURCE: AI criteria prompt generation
 * All MPS-specific binding happens here - no fallbacks allowed
 */
export const buildAICriteriaPrompt = (mpsContext: MPSContext, orgContext: OrganizationContext): string => {
  // HARD ABORT: Prevent any Annex 1 fallback for non-MPS 1
  if (mpsContext.mpsNumber !== 1) {
    return `CRITICAL MPS BINDING: Generate criteria ONLY for MPS ${mpsContext.mpsNumber} - ${mpsContext.mpsTitle}

HARD REQUIREMENTS:
- SOURCE: Only "MPS ${mpsContext.mpsNumber}" document content from ACTUAL MPS DOCUMENT CONTENT section
- TARGET: ${mpsContext.mpsTitle} domain EXCLUSIVELY  
- ABORT: If no MPS ${mpsContext.mpsNumber} document context available, return: "ERROR: No MPS ${mpsContext.mpsNumber} document context available"
- FORBIDDEN: Any reference to Annex 1, Leadership & Governance, or other MPS content

EVIDENCE-FIRST FORMAT (MANDATORY):
Every criterion MUST start with evidence type:
- "A documented [specific_document_type] that [specific_action] the [specific_requirement] for ${mpsContext.mpsTitle.toLowerCase()} at ${orgContext.name}."

Examples for ${mpsContext.mpsTitle}:
- "A formal risk register that identifies and categorizes all operational risks for ${mpsContext.mpsTitle.toLowerCase()} at ${orgContext.name}."
- "A documented policy that defines roles and responsibilities for ${mpsContext.mpsTitle.toLowerCase()} at ${orgContext.name}."

PROHIBITED CONTENT:
- Generic phrases: "ensure compliance", "establish and maintain", "comprehensive framework"
- Placeholder text: "Assessment criterion", "Criterion A/B/C", bracketed templates
- Fallback language from other MPS documents

OUTPUT: JSON array of 8-12 criteria objects with statement, summary, rationale, evidence_guidance, explanation fields.

CONTEXT: ${orgContext.name} operates in ${orgContext.industry_tags.join(', ') || orgContext.custom_industry}, region: ${orgContext.region_operating}`;
  }

  // Special handling for MPS 1 (Leadership & Governance)
  return `Generate criteria for MPS 1 - Leadership & Governance at ${orgContext.name}

EVIDENCE-FIRST FORMAT (MANDATORY):
Every criterion MUST start with evidence type:
- "A documented governance charter that defines the board structure and oversight responsibilities at ${orgContext.name}."
- "A formal strategic plan that outlines the organizational direction and priorities for ${orgContext.name}."

OUTPUT: JSON array of 8-12 criteria objects with statement, summary, rationale, evidence_guidance, explanation fields.`;
};

/**
 * COMPREHENSIVE VALIDATION: Single validation engine
 * Detects all violation types and provides detailed feedback
 */
export const validateCriteria = (criteria: any[], orgContext: OrganizationContext, mpsContext: MPSContext): ValidationResult => {
  const errors: string[] = [];
  let hasAnnex1Fallback = false;
  let hasPlaceholders = false;
  let hasEvidenceFirstViolations = false;

  // HARD CHECK: Annex 1 fallback detection
  criteria.forEach((criterion, index) => {
    if (detectAnnex1Fallback(criterion.statement || '', mpsContext.mpsNumber)) {
      hasAnnex1Fallback = true;
      errors.push(`Criterion ${index + 1}: BLOCKED - Annex 1 fallback detected for MPS ${mpsContext.mpsNumber}`);
    }
  });

  // Check for prohibited placeholder text (excluding valid MPS patterns)
  criteria.forEach((criterion, index) => {
    const statement = criterion.statement || '';
    const summary = criterion.summary || '';
    
    // More specific placeholder detection - avoid false positives
    const placeholderPatterns = [
      /Assessment criterion/i,
      /Criterion\s+[A-Z]$/i, // "Criterion A", "Criterion B" but not "criterion for..."
      /Summary for criterion/i,
      /\[.*\]/g, // Bracketed placeholders like [requirement]
      /^\s*\d+\.\s*Criterion/i, // "1. Criterion..."
      new RegExp(`^${orgContext.name}\\s+must\\s+`, 'i') // Org name must...
    ];
    
    const hasProhibitedPattern = placeholderPatterns.some(pattern => {
      return pattern.test(statement) || pattern.test(summary);
    });
    
    if (hasProhibitedPattern) {
      hasPlaceholders = true;
      errors.push(`Criterion ${index + 1}: BLOCKED - Placeholder text detected`);
    }
  });

  // Validate evidence-first format compliance
  criteria.forEach((criterion, index) => {
    const statement = criterion.statement || '';
    
    // 🚨 UPDATED: Comprehensive evidence-first pattern for all diverse evidence types
    const evidenceFirstPattern = /^(A|An)\s+(documented|formal|quarterly|annual|comprehensive|detailed|written|approved|maintained|updated|current|complete)\s+(risk register|policy|report|document|procedure|assessment|analysis|review|register|record|log|matrix|framework|standard|guideline|charter|plan|dashboard|stakeholder plan|succession document|training outline|code of conduct|organizational chart|competency framework)|^Minutes of\s+/i;
    
    if (!evidenceFirstPattern.test(statement)) {
      hasEvidenceFirstViolations = true;
      errors.push(`Criterion ${index + 1}: BLOCKED - Evidence-first format violation`);
    }
  });

  // HARD ABORT conditions
  if (hasAnnex1Fallback || hasPlaceholders || hasEvidenceFirstViolations) {
    return {
      isValid: false,
      errors,
      validCriteria: [],
      hasAnnex1Fallback,
      hasPlaceholders,
      hasEvidenceFirstViolations
    };
  }

  // Enhance with organization context if needed
  const enhancedCriteria = criteria.map(criterion => ({
    ...criterion,
    explanation: criterion.explanation?.includes(orgContext.name) 
      ? criterion.explanation 
      : `This criterion ensures ${orgContext.name} ${criterion.explanation || 'meets the required standards'}.`
  }));

  return {
    isValid: true,
    errors: [],
    validCriteria: enhancedCriteria,
    hasAnnex1Fallback: false,
    hasPlaceholders: false,
    hasEvidenceFirstViolations: false
  };
};

/**
 * Cleans and extracts JSON from AI response
 */
export const cleanJSON = (jsonStr: string): string => {
  let cleaned = jsonStr.trim();
  const jsonStart = cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf(']') !== -1 ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No valid JSON found');
  }
  
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  return cleaned.replace(/,(\s*[}\]])/g, '$1');
};