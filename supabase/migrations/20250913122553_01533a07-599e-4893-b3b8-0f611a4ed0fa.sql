begin;
alter table public.ai_documents
  drop constraint if exists ai_documents_document_type_check;
alter table public.ai_documents
  add constraint ai_documents_document_type_check
  check (document_type = any (array[
    'guidance_document'::text,'mps_document'::text,'best_practice'::text,'case_study'::text,'template'::text,'checklist'::text,'governance_reasoning_manifest'::text,'scoring_logic'::text,'assessment_framework_component'::text,'ai_logic_rule_global'::text,'threat_intelligence_profile'::text,'policy_model'::text,'sop_procedure'::text,'policy_statement'::text,'evidence_sample'::text,'training_module'::text,'awareness_material'::text,'implementation_guide'::text,'tool_reference'::text,'audit_template'::text,'use_case_scenario'::text,'evaluation_rubric'::text,'data_model'::text,'decision_tree_logic'::text,'maturity_model'::text,'general'::text,
    'diamond_knowledge_pack'::text
  ]));
alter table public.ai_document_versions
  drop constraint if exists ai_document_versions_document_type_check;
alter table public.ai_document_versions
  add constraint ai_document_versions_document_type_check
  check (document_type = any (array[
    'guidance_document'::text,'mps_document'::text,'best_practice'::text,'case_study'::text,'template'::text,'checklist'::text,'governance_reasoning_manifest'::text,'scoring_logic'::text,'assessment_framework_component'::text,'ai_logic_rule_global'::text,'threat_intelligence_profile'::text,'policy_model'::text,'sop_procedure'::text,'policy_statement'::text,'evidence_sample'::text,'training_module'::text,'awareness_material'::text,'implementation_guide'::text,'tool_reference'::text,'audit_template'::text,'use_case_scenario'::text,'evaluation_rubric'::text,'data_model'::text,'decision_tree_logic'::text,'general'::text,'maturity_model'::text,
    'diamond_knowledge_pack'::text
  ]));
commit;