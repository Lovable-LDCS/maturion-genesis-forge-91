/**
 * Utility functions for AI prompt generation and validation
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

/**
 * Generates a clean, MPS-specific prompt for AI criteria generation
 * Ensures no hardcoded fallbacks and proper context binding
 */
export const buildAICriteriaPrompt = (mpsContext: MPSContext, orgContext: OrganizationContext): string => {
  return `GENERATE CRITERIA FOR SPECIFIC MPS: ${mpsContext.mpsNumber} - ${mpsContext.mpsTitle}

CRITICAL CONTEXT BINDING:
- Target MPS: ${mpsContext.mpsNumber}
- MPS Title: ${mpsContext.mpsTitle}
- Organization: ${orgContext.name}
- Domain: Leadership & Governance
- MPS ID: ${mpsContext.mpsId}

MANDATORY REQUIREMENTS FOR MPS ${mpsContext.mpsNumber}:
- ONLY generate criteria related to "${mpsContext.mpsTitle}"
- Extract content from uploaded "MPS ${mpsContext.mpsNumber} - ${mpsContext.mpsTitle}.docx" document
- NO fallback to other MPS documents
- ALL criteria must be specific to ${mpsContext.mpsTitle} domain

EVIDENCE-FIRST FORMAT (MANDATORY):
Every criterion MUST start with evidence type and relate to ${mpsContext.mpsTitle}:
- "A documented risk register identifies, categorizes, and prioritizes operational risks across all ${orgContext.name} business units."
- "A formal policy that is approved by senior management defines the roles and responsibilities for ${mpsContext.mpsTitle.toLowerCase()} within ${orgContext.name}."
- "A quarterly report submitted to the board documents the effectiveness of ${mpsContext.mpsTitle.toLowerCase()} controls implemented across ${orgContext.name}."

ANNEX 2 COMPLIANCE (ALL 7 RULES):
1. Evidence-first format - Start with document/policy/register/report/procedure
2. Single evidence per criterion - No compound verbs like "establish and maintain"
3. Measurable verbs - Use "identifies", "defines", "documents", "tracks", "outlines", "assigns"
4. Unambiguous context - Be specific about scope and requirements for ${mpsContext.mpsTitle}
5. Organizational tailoring - Reference ${orgContext.name} throughout
6. No duplicates - Different evidence types or contexts are allowed
7. Complete structure - All fields must be fully populated

OUTPUT STRUCTURE FOR MPS ${mpsContext.mpsNumber}:
{
  "statement": "A [evidence_type] that is [qualifier] [verb] the [requirement] of [stakeholder] for ${mpsContext.mpsTitle.toLowerCase()} at ${orgContext.name}.",
  "summary": "[10-15 word description related to ${mpsContext.mpsTitle}]",
  "rationale": "[Why critical for ${orgContext.name}'s ${mpsContext.mpsTitle.toLowerCase()} - max 25 words]",
  "evidence_guidance": "[Specific ${mpsContext.mpsTitle} document requirements from MPS ${mpsContext.mpsNumber}]",
  "explanation": "[Detailed explanation with ${orgContext.name} context for ${mpsContext.mpsTitle}]"
}

ORGANIZATIONAL CONTEXT:
- Organization: ${orgContext.name}
- Industry: ${orgContext.industry_tags.join(', ') || orgContext.custom_industry}
- Region: ${orgContext.region_operating}
- Compliance: ${orgContext.compliance_commitments.join(', ')}

STRICT REQUIREMENTS:
- Source: ONLY MPS ${mpsContext.mpsNumber} document content
- Topic: ONLY ${mpsContext.mpsTitle} related criteria
- Count: Generate 8-12 criteria based on MPS ${mpsContext.mpsNumber} document content
- Format: Evidence-first format for all statements
- Context: Include ${orgContext.name} and ${mpsContext.mpsTitle} throughout
- Validation: NO placeholder text, NO generic templates

Return JSON array of ${mpsContext.mpsTitle}-specific criteria objects.`;
};

/**
 * Validates generated criteria against all compliance rules
 */
export const validateCriteria = (criteria: any[], orgContext: OrganizationContext): { 
  isValid: boolean; 
  errors: string[]; 
  validCriteria: any[] 
} => {
  const errors: string[] = [];
  
  // Check for prohibited placeholder text
  const hasProhibitedPlaceholders = criteria.some(criterion => 
    criterion.statement?.includes('Assessment criterion') ||
    criterion.statement?.includes('Criterion ') ||
    criterion.summary?.includes('Summary for criterion') ||
    criterion.statement?.startsWith(orgContext.name + ' must')
  );

  if (hasProhibitedPlaceholders) {
    errors.push('AI generated prohibited placeholder text');
  }

  // Validate evidence-first format compliance
  const nonCompliantCriteria = criteria.filter(criterion =>
    !criterion.statement?.match(/^A\s+(documented|formal|quarterly|annual|comprehensive|detailed|written|approved|maintained|updated|current|complete)\s+(risk register|policy|report|document|procedure|assessment|analysis|review|register|record|log|matrix|framework|standard|guideline)/i)
  );

  if (nonCompliantCriteria.length > 0) {
    errors.push(`${nonCompliantCriteria.length} criteria failed evidence-first format validation`);
  }

  // Check organization context integration
  const hasOrgContextIntegration = criteria.every(criterion => 
    criterion.explanation?.includes(orgContext.name) ||
    criterion.statement?.includes(orgContext.name)
  );

  if (!hasOrgContextIntegration) {
    // Enhance with organization context where needed
    criteria = criteria.map(criterion => ({
      ...criterion,
      explanation: criterion.explanation?.includes(orgContext.name) 
        ? criterion.explanation 
        : `This criterion ensures ${orgContext.name} ${criterion.explanation || 'meets the required standards'}.`
    }));
  }

  return {
    isValid: errors.length === 0,
    errors,
    validCriteria: criteria
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