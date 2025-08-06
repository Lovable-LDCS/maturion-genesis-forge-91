// Shared document constants for upload and edit forms
// Ensures consistency across all document-related dropdowns

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'ai_logic_rule_global', label: 'AI Logic Rule' },
  { value: 'assessment_framework_component', label: 'Assessment Framework' },
  { value: 'audit_template', label: 'Audit Template' },
  { value: 'awareness_material', label: 'Awareness Material' },
  { value: 'best_practice', label: 'Best Practice' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'data_model', label: 'Data Model' },
  { value: 'decision_tree_logic', label: 'Decision Tree / Logic Map' },
  { value: 'evaluation_rubric', label: 'Evaluation Rubric' },
  { value: 'evidence_sample', label: 'Evidence Sample' },
  { value: 'general', label: 'General' },
  { value: 'governance_reasoning_manifest', label: 'Governance Reasoning' },
  { value: 'guidance_document', label: 'Guidance Document' },
  { value: 'implementation_guide', label: 'Implementation Guide' },
  { value: 'maturity_model', label: 'Maturity Model' },
  { value: 'mps_document', label: 'MPS Document' },
  { value: 'policy_model', label: 'Policy Model' },
  { value: 'policy_statement', label: 'Policy Statement' },
  { value: 'scoring_logic', label: 'Scoring Logic' },
  { value: 'sop_procedure', label: 'SOP (Standard Operating Procedure)' },
  { value: 'template', label: 'Template' },
  { value: 'threat_intelligence_profile', label: 'Threat Intelligence' },
  { value: 'tool_reference', label: 'Tool Reference' },
  { value: 'training_module', label: 'Training Module' },
  { value: 'use_case_scenario', label: 'Use Case / Scenario' }
];

export const DOMAIN_OPTIONS = [
  'AI Governance',
  'Analytics & Reporting',
  'Assessment & Evidence Logic',
  'Control Environment',
  'Global Instruction',
  'Global Platform Logic',
  'Incident Management',
  'Leadership & Governance',
  'Legal & Compliance',
  'Maturion Engine Logic',
  'People & Culture',
  'Process Integrity',
  'Proof it Works',
  'Protection',
  'Surveillance & Monitoring',
  'System Integrity & Infrastructure',
  'Third-Party Risk',
  'Threat Environment',
  'Training & Awareness'
];

export const VISIBILITY_OPTIONS = [
  { value: 'all_users', label: 'All Users' },
  { value: 'superusers_only', label: 'Superusers Only' },
  { value: 'ai_only', label: 'Maturion AI only' }
];

// Helper to get document type label by value
export const getDocumentTypeLabel = (value: string): string => {
  const option = DOCUMENT_TYPE_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
};

// Helper to get visibility label by value
export const getVisibilityLabel = (value: string): string => {
  const option = VISIBILITY_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
};

// Field descriptions for tooltips
export const FIELD_DESCRIPTIONS = {
  documentType: "Choose the category that best describes your document's purpose and content type.",
  domain: "Select the functional area or domain this document primarily relates to within your organization.",
  visibility: "Control who can view this document: All Users (everyone), Superusers Only (admins), or Maturion AI only (hidden from users but used for AI processing).",
  tags: "Add comma-separated keywords to help categorize and search for this document (e.g., iso27001, risk-management, audit).",
  description: "Optional context or notes about this document that will help the AI understand its purpose and content."
};