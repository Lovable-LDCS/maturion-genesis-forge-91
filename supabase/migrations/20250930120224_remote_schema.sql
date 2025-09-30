create extension if not exists "pg_net" with schema "public" version '0.19.5';

create extension if not exists "pg_trgm" with schema "public" version '1.6';

create extension if not exists "vector" with schema "public" version '0.8.0';

create type "public"."approval_decision" as enum ('pending', 'approved', 'rejected', 'escalated');

create type "public"."assessment_status" as enum ('not_started', 'in_progress', 'ai_evaluated', 'submitted_for_approval', 'approved_locked', 'rejected', 'escalated', 'alternative_proposal');

create type "public"."crawl_status" as enum ('queued', 'fetching', 'done', 'failed');

create type "public"."doc_status" as enum ('pending', 'ready', 'failed');

create type "public"."evidence_type" as enum ('document', 'photo', 'log', 'comment');

create type "public"."ingest_job_status" as enum ('running', 'completed', 'failed', 'cancelled', 'queued', 'done');

create type "public"."ingest_job_type" as enum ('nightly_crawl', 'manual', 'backfill', 'crawl_extract');

create type "public"."invitation_status" as enum ('pending', 'accepted', 'expired', 'cancelled');

create type "public"."maturity_level" as enum ('basic', 'reactive', 'compliant', 'proactive', 'resilient');

create type "public"."milestone_priority" as enum ('critical', 'high', 'medium', 'low');

create type "public"."milestone_status" as enum ('not_started', 'in_progress', 'ready_for_test', 'signed_off', 'failed', 'rejected', 'escalated', 'alternative_proposal');

create type "public"."risk_level" as enum ('Low', 'Medium', 'High');

create type "public"."source_type" as enum ('RSS', 'API', 'Manual');

create type "public"."threat_sensitivity_level" as enum ('Basic', 'Moderate', 'Advanced');

create type "public"."visibility_scope" as enum ('global', 'region', 'industry-specific', 'private');

create sequence "public"."chunks_id_seq";

create sequence "public"."system_reports_id_seq";

create table "public"."adaptive_learning_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "metric_type" text not null,
    "metric_category" text not null,
    "measurement_period_start" timestamp with time zone not null,
    "measurement_period_end" timestamp with time zone not null,
    "baseline_value" numeric(10,4),
    "current_value" numeric(10,4) not null,
    "improvement_percentage" numeric(5,2),
    "measurement_context" jsonb default '{}'::jsonb,
    "data_points_count" integer not null default 0,
    "confidence_interval" jsonb,
    "trend_direction" text,
    "significance_level" numeric(5,4) default 0.05,
    "measurement_notes" text,
    "created_at" timestamp with time zone not null default now(),
    "measured_by" uuid
);


alter table "public"."adaptive_learning_metrics" enable row level security;

create table "public"."admin_activity_log" (
    "id" uuid not null default gen_random_uuid(),
    "admin_user_id" uuid not null,
    "action_type" text not null,
    "entity_type" text not null,
    "entity_id" uuid,
    "details" jsonb,
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."admin_activity_log" enable row level security;

create table "public"."admin_approval_requests" (
    "id" uuid not null default gen_random_uuid(),
    "request_type" text not null,
    "entity_type" text not null,
    "entity_id" uuid not null,
    "requested_changes" jsonb not null,
    "status" text not null default 'pending'::text,
    "requested_by" uuid not null,
    "approved_by" uuid,
    "rejection_reason" text,
    "expires_at" timestamp with time zone not null default (now() + '48:00:00'::interval),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."admin_approval_requests" enable row level security;

create table "public"."admin_users" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "email" text not null,
    "role" text not null default 'admin'::text,
    "granted_by" uuid,
    "granted_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."admin_users" enable row level security;

create table "public"."ai_behavior_monitoring" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "document_id" uuid,
    "criteria_id" uuid,
    "behavior_type" text not null,
    "confidence_score" numeric(5,2) not null default 0.00,
    "detected_content" text not null,
    "expected_pattern" text,
    "severity_level" text not null default 'medium'::text,
    "auto_flagged" boolean not null default true,
    "reviewed_by" uuid,
    "review_status" text default 'pending'::text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone
);


alter table "public"."ai_behavior_monitoring" enable row level security;

create table "public"."ai_chunk_hash_stats" (
    "hash" text not null,
    "doc_count" integer not null,
    "chunk_count" integer not null,
    "last_computed_at" timestamp with time zone not null default now()
);


alter table "public"."ai_chunk_hash_stats" enable row level security;

create table "public"."ai_confidence_scoring" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "document_id" uuid,
    "criteria_id" uuid,
    "assessment_id" uuid,
    "confidence_category" text not null,
    "base_confidence" numeric(5,2) not null,
    "adjusted_confidence" numeric(5,2) not null,
    "confidence_factors" jsonb default '{}'::jsonb,
    "quality_indicators" jsonb default '{}'::jsonb,
    "drift_detected" boolean not null default false,
    "requires_human_review" boolean not null default false,
    "reviewed_by" uuid,
    "human_override_confidence" numeric(5,2),
    "override_reason" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."ai_confidence_scoring" enable row level security;

create table "public"."ai_document_chunks" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "organization_id" uuid not null,
    "chunk_index" integer not null,
    "content" text not null,
    "content_hash" text not null,
    "embedding" vector(1536),
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "tokens" integer,
    "page" integer,
    "section" text,
    "equipment_slugs" text[],
    "stage" text,
    "layer" smallint,
    "tags" text[],
    "status" text,
    "visibility" text,
    "uploaded_by" uuid,
    "uploaded_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "checksum" text,
    "quality_score" real,
    "is_clean" boolean
);


alter table "public"."ai_document_chunks" enable row level security;

create table "public"."ai_document_versions" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "version_number" integer not null,
    "title" text not null,
    "domain" text,
    "tags" text,
    "upload_notes" text,
    "document_type" text not null,
    "metadata" jsonb default '{}'::jsonb,
    "file_path" text not null,
    "file_name" text not null,
    "file_size" bigint not null,
    "mime_type" text not null,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "change_reason" text,
    "organization_id" uuid not null,
    "visibility" text,
    "language" text,
    "source_url" text,
    "file_ext" text,
    "version" integer,
    "status" text,
    "uploaded_by" uuid,
    "updated_at" timestamp with time zone default now(),
    "checksum" text
);


alter table "public"."ai_document_versions" enable row level security;

create table "public"."ai_documents" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "file_name" text not null,
    "file_path" text not null,
    "file_size" bigint not null,
    "mime_type" text not null,
    "document_type" text not null,
    "processing_status" text not null default 'pending'::text,
    "total_chunks" integer default 0,
    "metadata" jsonb default '{}'::jsonb,
    "uploaded_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "processed_at" timestamp with time zone,
    "domain" text,
    "upload_notes" text,
    "title" text,
    "updated_by" uuid not null,
    "chunked_from_tester" boolean default false,
    "tester_approved_at" timestamp with time zone,
    "tester_approved_by" uuid,
    "processing_version" integer default 1,
    "schema_version" integer default 2,
    "unified_upload_metadata" jsonb default '{}'::jsonb,
    "is_ai_ingested" boolean default false,
    "doc_type" text,
    "layer" smallint,
    "stage" text,
    "source" text default 'upload'::text,
    "bucket_id" text,
    "object_path" text,
    "size_bytes" bigint,
    "error" text,
    "tags" text[],
    "visibility" text,
    "language" text,
    "source_url" text,
    "file_ext" text,
    "version" integer default 1,
    "status" text default 'active'::text,
    "checksum" text,
    "deleted_at" timestamp with time zone,
    "context_level" text default 'organization'::text,
    "target_organization_id" uuid
);


alter table "public"."ai_documents" enable row level security;

create table "public"."ai_feedback_log" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "domain_id" uuid,
    "user_id" uuid not null,
    "rejected_text" text not null,
    "replacement_text" text,
    "reason" text not null,
    "feedback_type" text not null,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."ai_feedback_log" enable row level security;

create table "public"."ai_feedback_loop_log" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "feedback_type" text not null,
    "original_content" text not null,
    "modified_content" text,
    "rejection_reason" text,
    "correction_type" text,
    "confidence_impact" numeric(5,2),
    "learning_weight" numeric(3,2) default 1.00,
    "applied_to_model" boolean not null default false,
    "cross_org_applicable" boolean not null default false,
    "pattern_extracted" boolean not null default false,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "applied_at" timestamp with time zone
);


alter table "public"."ai_feedback_loop_log" enable row level security;

create table "public"."ai_feedback_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "document_id" uuid,
    "criteria_id" uuid,
    "ai_generated_content" text not null,
    "feedback_type" text not null,
    "feedback_category" text,
    "user_comments" text,
    "revision_instructions" text,
    "human_override_content" text,
    "justification" text,
    "confidence_rating" integer,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone
);


alter table "public"."ai_feedback_submissions" enable row level security;

create table "public"."ai_learning_patterns" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "pattern_type" text not null,
    "pattern_category" text not null,
    "pattern_text" text not null,
    "confidence_score" numeric(5,2) not null default 0.00,
    "frequency_count" integer not null default 1,
    "first_detected_at" timestamp with time zone not null default now(),
    "last_detected_at" timestamp with time zone not null default now(),
    "source_feedback_ids" uuid[] default '{}'::uuid[],
    "affected_domains" text[] default '{}'::text[],
    "affected_sectors" text[] default '{}'::text[],
    "pattern_strength" text not null default 'weak'::text,
    "validation_status" text not null default 'unvalidated'::text,
    "validated_by" uuid,
    "validated_at" timestamp with time zone,
    "suppression_rule" text,
    "replacement_suggestion" text,
    "learning_weight" numeric(5,2) not null default 1.00,
    "is_active" boolean not null default true,
    "cross_org_applicable" boolean not null default false,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."ai_learning_patterns" enable row level security;

create table "public"."ai_upload_audit" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "document_id" uuid,
    "action" text not null,
    "user_id" uuid not null,
    "ip_address" inet,
    "user_agent" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "document_type" text,
    "domain" text,
    "file_ext" text,
    "language" text,
    "mime_type" text,
    "checksum" text,
    "visibility" text
);


alter table "public"."ai_upload_audit" enable row level security;

create table "public"."api_usage_log" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "user_id" uuid,
    "endpoint" text not null,
    "method" text not null,
    "request_payload" jsonb default '{}'::jsonb,
    "response_status" integer,
    "response_data" jsonb default '{}'::jsonb,
    "execution_time_ms" integer,
    "ip_address" inet,
    "user_agent" text,
    "data_source_id" uuid,
    "request_id" text,
    "created_at" timestamp with time zone not null default now(),
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."api_usage_log" enable row level security;

create table "public"."approval_requests" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "requester_id" uuid not null,
    "approver_id" uuid,
    "entity_type" text not null,
    "entity_id" uuid not null,
    "request_type" text not null,
    "request_details" jsonb,
    "decision" approval_decision not null default 'pending'::approval_decision,
    "decision_reason" text,
    "decided_by" uuid,
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."approval_requests" enable row level security;

create table "public"."approved_chunks_cache" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "chunk_index" integer not null,
    "content" text not null,
    "content_hash" text not null,
    "metadata" jsonb default '{}'::jsonb,
    "extraction_method" text default 'chunk_tester'::text,
    "approved_at" timestamp with time zone not null default now(),
    "approved_by" uuid not null,
    "organization_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."approved_chunks_cache" enable row level security;

create table "public"."assessment_scores" (
    "id" uuid not null default gen_random_uuid(),
    "assessment_id" uuid not null,
    "criteria_id" uuid not null,
    "organization_id" uuid not null,
    "current_maturity_level" maturity_level,
    "target_maturity_level" maturity_level,
    "evidence_completeness_score" numeric(5,2) default 0.00,
    "overall_score" numeric(5,2) default 0.00,
    "ai_suggested_level" maturity_level,
    "ai_confidence_score" numeric(5,2),
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "status" assessment_status not null default 'not_started'::assessment_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."assessment_scores" enable row level security;

create table "public"."assessments" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "name" text not null,
    "description" text,
    "assessment_period_start" date,
    "assessment_period_end" date,
    "status" assessment_status not null default 'not_started'::assessment_status,
    "overall_completion_percentage" numeric(5,2) default 0.00,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null,
    "ai_evaluation_result" jsonb,
    "ai_feedback_summary" text,
    "user_acceptance_status" text default 'pending'::text,
    "ai_confidence_score" numeric(5,2)
);


alter table "public"."assessments" enable row level security;

create table "public"."audit_trail" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "table_name" text not null,
    "record_id" uuid not null,
    "action" text not null,
    "field_name" text,
    "old_value" text,
    "new_value" text,
    "changed_by" uuid not null,
    "changed_at" timestamp with time zone not null default now(),
    "change_reason" text,
    "session_id" text,
    "ip_address" inet
);


alter table "public"."audit_trail" enable row level security;

create table "public"."auditor_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "auditor_id" uuid not null,
    "assessment_id" uuid not null,
    "assigned_by" uuid not null,
    "assigned_at" timestamp with time zone not null default now(),
    "status" text not null default 'assigned'::text,
    "notes" text,
    "site_visit_date" date,
    "completion_date" date,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."auditor_assignments" enable row level security;

create table "public"."backoffice_admins" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "email" text not null,
    "granted_by" uuid,
    "granted_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
);


alter table "public"."backoffice_admins" enable row level security;

create table "public"."chunks" (
    "id" bigint not null default nextval('chunks_id_seq'::regclass),
    "document_id" uuid not null,
    "content" text not null,
    "embedding" vector(1536) not null
);


alter table "public"."chunks" enable row level security;

create table "public"."conversation_history" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "user_id" uuid,
    "prompt" text not null,
    "response" text not null,
    "openai_response_id" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."conversation_history" enable row level security;

create table "public"."criteria" (
    "id" uuid not null default gen_random_uuid(),
    "mps_id" uuid not null,
    "organization_id" uuid not null,
    "criteria_number" text not null,
    "statement" text not null,
    "summary" text,
    "ai_suggested_statement" text,
    "ai_suggested_summary" text,
    "statement_approved_by" uuid,
    "statement_approved_at" timestamp with time zone,
    "status" assessment_status not null default 'not_started'::assessment_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null,
    "deferral_status" text
);


alter table "public"."criteria" enable row level security;

create table "public"."criteria_deferrals" (
    "id" uuid not null default gen_random_uuid(),
    "proposed_criteria_id" uuid not null,
    "organization_id" uuid not null,
    "suggested_domain" text not null,
    "suggested_mps_number" integer not null,
    "suggested_mps_title" text,
    "reason" text,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "approved" boolean not null default false,
    "deferred_at" timestamp with time zone not null default now(),
    "original_mps_id" uuid
);


alter table "public"."criteria_deferrals" enable row level security;

create table "public"."criteria_edit_history" (
    "id" uuid not null default gen_random_uuid(),
    "criteria_id" uuid not null,
    "organization_id" uuid not null,
    "edited_by" uuid not null,
    "edited_at" timestamp with time zone not null default now(),
    "field_name" text not null,
    "old_value" text,
    "new_value" text,
    "change_reason" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."criteria_edit_history" enable row level security;

create table "public"."criteria_rejections" (
    "id" uuid not null default gen_random_uuid(),
    "criteria_id" uuid not null,
    "organization_id" uuid not null,
    "rejected_by" uuid not null,
    "rejected_at" timestamp with time zone not null default now(),
    "rejection_reason" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."criteria_rejections" enable row level security;

create table "public"."cross_org_tracking" (
    "id" uuid not null default gen_random_uuid(),
    "source_organization_id" uuid not null,
    "target_organization_id" uuid,
    "tracking_type" text not null,
    "content_hash" text not null,
    "similarity_score" numeric(5,2),
    "flagged_for_review" boolean not null default false,
    "reviewed_by" uuid,
    "review_status" text default 'pending'::text,
    "action_taken" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "reviewed_at" timestamp with time zone
);


alter table "public"."cross_org_tracking" enable row level security;

create table "public"."data_source_sync_logs" (
    "id" uuid not null default gen_random_uuid(),
    "data_source_id" uuid not null,
    "organization_id" uuid not null,
    "sync_started_at" timestamp with time zone not null default now(),
    "sync_completed_at" timestamp with time zone,
    "sync_status" text not null default 'in_progress'::text,
    "items_processed" integer default 0,
    "items_added" integer default 0,
    "items_updated" integer default 0,
    "items_failed" integer default 0,
    "error_messages" text[],
    "sync_summary" jsonb default '{}'::jsonb,
    "triggered_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "sync_progress_message" text
);


alter table "public"."data_source_sync_logs" enable row level security;

create table "public"."data_sources" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "source_name" text not null,
    "source_type" text not null,
    "connection_config" jsonb not null default '{}'::jsonb,
    "credentials_encrypted" text,
    "is_active" boolean not null default true,
    "last_sync_at" timestamp with time zone,
    "sync_status" text default 'never_synced'::text,
    "sync_error_message" text,
    "created_by" uuid not null,
    "updated_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."data_sources" enable row level security;

create table "public"."deduplication_reports" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "report_type" text not null default 'weekly'::text,
    "duplicates_found" integer default 0,
    "duplicates_merged" integer default 0,
    "report_data" jsonb default '{}'::jsonb,
    "generated_by" uuid,
    "generated_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."deduplication_reports" enable row level security;

create table "public"."discount_codes" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "type" text not null,
    "value" numeric(10,2) not null,
    "applicable_modules" uuid[] default '{}'::uuid[],
    "expiry_date" timestamp with time zone,
    "usage_limit" integer,
    "current_usage" integer not null default 0,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."discount_codes" enable row level security;

create table "public"."document_types" (
    "name" text not null
);


alter table "public"."document_types" enable row level security;

create table "public"."domains" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "name" text not null,
    "intent_statement" text,
    "ai_suggested_intent" text,
    "intent_approved_by" uuid,
    "intent_approved_at" timestamp with time zone,
    "display_order" integer not null default 0,
    "status" assessment_status not null default 'not_started'::assessment_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null,
    "order_index" integer default 0,
    "code" text
);


alter table "public"."domains" enable row level security;

create table "public"."evidence" (
    "id" uuid not null default gen_random_uuid(),
    "criteria_id" uuid not null,
    "assessment_id" uuid not null,
    "organization_id" uuid not null,
    "evidence_type" evidence_type not null,
    "title" text not null,
    "description" text,
    "file_path" text,
    "file_name" text,
    "file_size" integer,
    "mime_type" text,
    "findings" text,
    "recommendations" text,
    "ai_suggested_findings" text,
    "ai_suggested_recommendations" text,
    "findings_approved_by" uuid,
    "findings_approved_at" timestamp with time zone,
    "compliance_score" numeric(5,2) default 0.00,
    "ai_compliance_score" numeric(5,2),
    "status" assessment_status not null default 'not_started'::assessment_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."evidence" enable row level security;

create table "public"."evidence_submissions" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "criteria_id" uuid,
    "assessment_id" uuid,
    "data_source_id" uuid,
    "evidence_type" text not null,
    "title" text not null,
    "description" text,
    "file_path" text,
    "file_url" text,
    "file_size" bigint,
    "mime_type" text,
    "evidence_data" jsonb default '{}'::jsonb,
    "submission_method" text default 'manual'::text,
    "submitted_by" uuid not null,
    "submitted_at" timestamp with time zone not null default now(),
    "evaluation_status" text default 'pending'::text,
    "evaluation_result" jsonb default '{}'::jsonb,
    "ai_confidence_score" numeric(5,2),
    "human_review_required" boolean default false,
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "reviewer_comments" text,
    "maturity_level_suggestion" text,
    "compliance_score" numeric(5,2),
    "risk_indicators" jsonb default '{}'::jsonb,
    "tags" text[] default '{}'::text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."evidence_submissions" enable row level security;

create table "public"."external_insights" (
    "id" uuid not null default gen_random_uuid(),
    "source_url" text,
    "title" text not null,
    "summary" text,
    "published_at" timestamp with time zone,
    "retrieved_at" timestamp with time zone not null default now(),
    "industry_tags" text[] default '{}'::text[],
    "region_tags" text[] default '{}'::text[],
    "threat_tags" text[] default '{}'::text[],
    "risk_level" risk_level default 'Medium'::risk_level,
    "source_type" source_type not null default 'Manual'::source_type,
    "is_verified" boolean not null default false,
    "matched_orgs" uuid[],
    "visibility_scope" visibility_scope not null default 'global'::visibility_scope,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "updated_by" uuid
);


alter table "public"."external_insights" enable row level security;

create table "public"."feedback_retraining_weights" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "feedback_type" text not null,
    "feedback_category" text not null,
    "weight_multiplier" numeric(4,2) not null default 1.00,
    "is_critical" boolean not null default false,
    "applies_to_content_types" text[] default '{}'::text[],
    "created_by" uuid not null,
    "updated_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."feedback_retraining_weights" enable row level security;

create table "public"."gap_tickets" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "prompt" text not null,
    "missing_specifics" text[] not null default '{}'::text[],
    "follow_up_date" timestamp with time zone not null,
    "status" text not null default 'pending'::text,
    "email_sent" boolean not null default false,
    "response_received" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "updated_by" uuid
);


alter table "public"."gap_tickets" enable row level security;

create table "public"."human_approval_workflows" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "entity_type" text not null,
    "entity_id" uuid not null,
    "workflow_status" text not null default 'pending_primary_review'::text,
    "primary_reviewer_id" uuid,
    "secondary_reviewer_id" uuid,
    "superuser_override_by" uuid,
    "primary_review_decision" text,
    "secondary_review_decision" text,
    "primary_review_comments" text,
    "secondary_review_comments" text,
    "superuser_override_reason" text,
    "requires_dual_signoff" boolean not null default false,
    "escalation_reason" text,
    "final_approved_content" text,
    "rejected_reason" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "primary_reviewed_at" timestamp with time zone,
    "secondary_reviewed_at" timestamp with time zone,
    "final_decision_at" timestamp with time zone,
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."human_approval_workflows" enable row level security;

create table "public"."learning_feedback_log" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "feedback_type" text not null,
    "original_content" text,
    "corrected_content" text,
    "confidence_before" numeric(5,2),
    "confidence_after" numeric(5,2),
    "learning_context" jsonb default '{}'::jsonb,
    "evidence_submission_id" uuid,
    "criteria_id" uuid,
    "assessment_id" uuid,
    "data_source_id" uuid,
    "applied_to_model" boolean default false,
    "applied_at" timestamp with time zone,
    "impact_score" numeric(5,2),
    "validation_status" text default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."learning_feedback_log" enable row level security;

create table "public"."learning_model_snapshots" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "snapshot_name" text not null,
    "snapshot_type" text not null default 'manual'::text,
    "snapshot_reason" text,
    "pattern_count" integer not null default 0,
    "active_rules_count" integer not null default 0,
    "model_state" jsonb not null default '{}'::jsonb,
    "performance_metrics" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "is_baseline" boolean not null default false,
    "rollback_available" boolean not null default true
);


alter table "public"."learning_model_snapshots" enable row level security;

create table "public"."learning_rule_configurations" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "rule_name" text not null,
    "rule_type" text not null,
    "rule_category" text not null,
    "rule_parameters" jsonb not null default '{}'::jsonb,
    "threshold_values" jsonb not null default '{}'::jsonb,
    "is_enabled" boolean not null default true,
    "applies_to_content_types" text[] default '{}'::text[],
    "applies_to_domains" text[] default '{}'::text[],
    "priority_level" integer not null default 5,
    "auto_activation_enabled" boolean not null default false,
    "last_triggered_at" timestamp with time zone,
    "trigger_count" integer not null default 0,
    "effectiveness_score" numeric(5,2) default 0.00,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."learning_rule_configurations" enable row level security;

create table "public"."maturity_levels" (
    "id" uuid not null default gen_random_uuid(),
    "criteria_id" uuid not null,
    "organization_id" uuid not null,
    "level" maturity_level not null,
    "descriptor" text not null,
    "ai_suggested_descriptor" text,
    "descriptor_approved_by" uuid,
    "descriptor_approved_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."maturity_levels" enable row level security;

create table "public"."maturity_practice_statements" (
    "id" uuid not null default gen_random_uuid(),
    "domain_id" uuid not null,
    "organization_id" uuid not null,
    "mps_number" integer not null,
    "name" text not null,
    "summary" text,
    "intent_statement" text,
    "ai_suggested_intent" text,
    "intent_approved_by" uuid,
    "intent_approved_at" timestamp with time zone,
    "status" assessment_status not null default 'not_started'::assessment_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."maturity_practice_statements" enable row level security;

create table "public"."migration_status" (
    "id" uuid not null default gen_random_uuid(),
    "migration_name" text not null,
    "status" text not null default 'pending'::text,
    "started_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "policy_log_id" uuid
);


alter table "public"."migration_status" enable row level security;

create table "public"."milestone_status_history" (
    "id" uuid not null default gen_random_uuid(),
    "entity_type" text not null,
    "entity_id" uuid not null,
    "organization_id" uuid not null,
    "old_status" milestone_status,
    "new_status" milestone_status not null,
    "change_reason" text,
    "changed_by" uuid not null,
    "changed_at" timestamp with time zone not null default now()
);


alter table "public"."milestone_status_history" enable row level security;

create table "public"."milestone_tasks" (
    "id" uuid not null default gen_random_uuid(),
    "milestone_id" uuid not null,
    "organization_id" uuid not null,
    "name" text not null,
    "description" text,
    "status" milestone_status not null default 'not_started'::milestone_status,
    "display_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."milestone_tasks" enable row level security;

create table "public"."milestone_test_notes" (
    "id" uuid not null default gen_random_uuid(),
    "milestone_task_id" uuid not null,
    "organization_id" uuid not null,
    "note_content" text not null,
    "status_at_time" milestone_status not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."milestone_test_notes" enable row level security;

create table "public"."milestones" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "name" text not null,
    "description" text,
    "priority" milestone_priority not null default 'medium'::milestone_priority,
    "phase" text,
    "week" integer,
    "status" milestone_status not null default 'not_started'::milestone_status,
    "display_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."milestones" enable row level security;

create table "public"."org_crawl_queue" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "url" text not null,
    "priority" integer not null default 100,
    "status" crawl_status not null default 'queued'::crawl_status,
    "attempts" integer not null default 0,
    "last_error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "retry_count" integer default 0,
    "last_attempt_at" timestamp with time zone,
    "error_reason" text
);


alter table "public"."org_crawl_queue" enable row level security;

create table "public"."org_domains" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "domain" text not null,
    "crawl_depth" integer not null default 2,
    "recrawl_hours" integer not null default 168,
    "is_enabled" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "updated_by" uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
    "organization_id" uuid not null
);


alter table "public"."org_domains" enable row level security;

create table "public"."org_ingest_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "started_at" timestamp with time zone not null default now(),
    "finished_at" timestamp with time zone,
    "status" ingest_job_status not null default 'running'::ingest_job_status,
    "stats" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "job_type" ingest_job_type not null default 'nightly_crawl'::ingest_job_type,
    "started_by" uuid,
    "updated_at" timestamp with time zone
);


alter table "public"."org_ingest_jobs" enable row level security;

create table "public"."org_page_chunks" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "page_id" uuid not null,
    "chunk_idx" integer not null,
    "text" text not null,
    "tokens" integer,
    "embedding" vector(1536),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."org_page_chunks" enable row level security;

create table "public"."org_pages" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "url" text not null,
    "domain" text not null,
    "title" text,
    "text" text,
    "html_hash" text,
    "fetched_at" timestamp with time zone not null default now(),
    "etag" text,
    "content_type" text,
    "robots_index" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."org_pages" enable row level security;

create table "public"."org_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "logo_url" text,
    "primary_color" text default '#3b82f6'::text,
    "accent_color" text default '#8b5cf6'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."org_profiles" enable row level security;

create table "public"."organization_documents" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "source_object_path" text not null,
    "mime_type" text,
    "status" doc_status not null default 'pending'::doc_status,
    "error_text" text,
    "pages" integer,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."organization_documents" enable row level security;

create table "public"."organization_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "invited_by" uuid not null,
    "email" text not null,
    "role" text not null,
    "status" invitation_status not null default 'pending'::invitation_status,
    "invitation_token" uuid not null default gen_random_uuid(),
    "expires_at" timestamp with time zone not null default (now() + '7 days'::interval),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."organization_invitations" enable row level security;

create table "public"."organization_members" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."organization_members" enable row level security;

create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "owner_id" uuid not null default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null default auth.uid(),
    "updated_by" uuid not null default auth.uid(),
    "logo_url" text,
    "slack_webhook_url" text,
    "email_webhook_url" text,
    "zapier_webhook_url" text,
    "primary_website_url" text,
    "linked_domains" text[],
    "industry_tags" text[],
    "region_operating" text,
    "risk_concerns" text[],
    "compliance_commitments" text[],
    "threat_sensitivity_level" threat_sensitivity_level default 'Basic'::threat_sensitivity_level,
    "custom_industry" text,
    "primary_color" text default '#0066cc'::text,
    "secondary_color" text default '#00cc99'::text,
    "text_color" text default '#ffffff'::text,
    "organization_type" text default 'primary'::text,
    "logo_object_path" text,
    "brand_logo_light_path" text,
    "brand_logo_dark_path" text,
    "brand_wordmark_black_path" text,
    "brand_wordmark_white_path" text,
    "brand_favicon_path" text,
    "brand_primary_hex" text,
    "brand_secondary_hex" text,
    "brand_text_hex" text,
    "brand_font_css" text,
    "brand_header_mode" text,
    "parent_organization_id" uuid,
    "organization_level" text default 'parent'::text
);


alter table "public"."organizations" enable row level security;

create table "public"."override_approvals" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "entity_type" text not null,
    "entity_id" uuid not null,
    "evidence_completeness_score" numeric(5,2) not null,
    "override_reason" text not null,
    "approved_by" uuid not null,
    "approved_at" timestamp with time zone not null default now(),
    "audit_notes" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."override_approvals" enable row level security;

create table "public"."pattern_recognition_history" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "pattern_id" uuid not null,
    "analysis_type" text not null,
    "previous_state" jsonb,
    "new_state" jsonb,
    "change_trigger" text not null,
    "change_details" jsonb default '{}'::jsonb,
    "confidence_change" numeric(5,2) default 0.00,
    "frequency_change" integer default 0,
    "triggered_by_feedback_id" uuid,
    "analysis_metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid
);


alter table "public"."pattern_recognition_history" enable row level security;

create table "public"."policy_change_log" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "type" text not null,
    "domain_scope" text not null,
    "linked_document_id" text,
    "summary" text not null,
    "tags" text[] default '{}'::text[],
    "logged_by" text not null,
    "organization_id" uuid,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."policy_change_log" enable row level security;

create table "public"."processing_pipeline_status" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "organization_id" uuid not null,
    "stage" text not null,
    "status" text not null default 'pending'::text,
    "started_at" timestamp with time zone default now(),
    "completed_at" timestamp with time zone,
    "error_details" jsonb,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."processing_pipeline_status" enable row level security;

create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "full_name" text,
    "email" text,
    "avatar_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."profiles" enable row level security;

create table "public"."qa_alerts" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "alert_type" text not null,
    "severity_level" text not null default 'info'::text,
    "title" text not null,
    "message" text not null,
    "alert_data" jsonb default '{}'::jsonb,
    "is_read" boolean not null default false,
    "is_resolved" boolean not null default false,
    "slack_sent" boolean not null default false,
    "slack_sent_at" timestamp with time zone,
    "resolved_by" uuid,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."qa_alerts" enable row level security;

create table "public"."qa_metrics" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "metric_type" text not null,
    "metric_value" numeric not null,
    "metric_data" jsonb default '{}'::jsonb,
    "recorded_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."qa_metrics" enable row level security;

create table "public"."qa_rules" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "rule_name" text not null,
    "rule_type" text not null,
    "rule_description" text,
    "rule_config" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "severity_level" text not null default 'warning'::text,
    "created_by" uuid not null,
    "updated_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."qa_rules" enable row level security;

create table "public"."qa_test_log" (
    "id" uuid not null default gen_random_uuid(),
    "run_at" timestamp with time zone default now(),
    "mps_number" integer not null,
    "mps_title" text not null,
    "test_type" text not null,
    "result" text not null,
    "criteria_generated" integer default 0,
    "drift_detected" boolean default false,
    "notes" text,
    "organization_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "run_type" text default 'scheduled'::text,
    "triggered_by" uuid
);


alter table "public"."qa_test_log" enable row level security;

create table "public"."refactor_qa_log" (
    "id" uuid not null default gen_random_uuid(),
    "run_at" timestamp with time zone default now(),
    "source_file" text not null,
    "finding_type" text not null,
    "severity" text not null,
    "description" text,
    "recommended_action" text,
    "detected_by" text default 'refactor-scanner-v1'::text,
    "organization_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "acknowledged" boolean default false,
    "review_notes" text,
    "acknowledged_by" uuid,
    "acknowledged_at" timestamp with time zone
);


alter table "public"."refactor_qa_log" enable row level security;

create table "public"."security_configuration" (
    "id" uuid not null default gen_random_uuid(),
    "setting_name" text not null,
    "setting_value" jsonb not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "updated_by" uuid
);


alter table "public"."security_configuration" enable row level security;

create table "public"."security_exceptions" (
    "id" uuid not null default gen_random_uuid(),
    "exception_type" text not null,
    "description" text not null,
    "rationale" text not null,
    "approved_by" text default 'system'::text,
    "approved_at" timestamp with time zone default now(),
    "review_date" timestamp with time zone,
    "status" text default 'approved'::text
);


alter table "public"."security_exceptions" enable row level security;

create table "public"."security_monitoring" (
    "id" uuid not null default gen_random_uuid(),
    "metric_type" text not null,
    "metric_value" numeric not null default 0,
    "metadata" jsonb default '{}'::jsonb,
    "recorded_at" timestamp with time zone not null default now(),
    "organization_id" uuid
);


alter table "public"."security_monitoring" enable row level security;

create table "public"."security_rate_limits" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "operation_type" text not null,
    "attempt_count" integer not null default 1,
    "window_start" timestamp with time zone not null default now(),
    "blocked_until" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."security_rate_limits" enable row level security;

create table "public"."subscription_modules" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "monthly_price" numeric(10,2) not null,
    "yearly_discount_percentage" numeric(5,2) not null default 10.00,
    "bundle_discount_percentage" numeric(5,2) not null default 0.00,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "updated_by" uuid not null
);


alter table "public"."subscription_modules" enable row level security;

create table "public"."system_drift_detection" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "drift_type" text not null,
    "baseline_value" numeric(10,4) not null,
    "current_value" numeric(10,4) not null,
    "drift_percentage" numeric(5,2) not null,
    "threshold_exceeded" boolean not null default false,
    "alert_triggered" boolean not null default false,
    "recovery_action_suggested" text,
    "recovery_status" text default 'pending'::text,
    "metadata" jsonb default '{}'::jsonb,
    "detected_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone
);


alter table "public"."system_drift_detection" enable row level security;

create table "public"."system_reports" (
    "id" bigint not null default nextval('system_reports_id_seq'::regclass),
    "created_at" timestamp with time zone not null default now(),
    "summary" jsonb not null
);


alter table "public"."system_reports" enable row level security;

create table "public"."upload_session_log" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" text not null,
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "document_count" integer default 0,
    "success_count" integer default 0,
    "failure_count" integer default 0,
    "total_size_bytes" bigint default 0,
    "session_data" jsonb default '{}'::jsonb,
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."upload_session_log" enable row level security;

create table "public"."watchdog_alerts" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "alert_type" text not null,
    "severity_level" text not null,
    "title" text not null,
    "message" text not null,
    "actionable_guidance" text,
    "related_incident_id" uuid,
    "auto_generated" boolean not null default true,
    "notification_sent" boolean not null default false,
    "notification_channels" jsonb default '[]'::jsonb,
    "acknowledged_by" uuid,
    "acknowledged_at" timestamp with time zone,
    "resolved" boolean not null default false,
    "resolved_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."watchdog_alerts" enable row level security;

create table "public"."watchdog_incidents" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "incident_type" text not null,
    "severity_level" text not null,
    "title" text not null,
    "description" text not null,
    "affected_entities" jsonb default '{}'::jsonb,
    "detection_method" text not null,
    "status" text not null default 'open'::text,
    "assigned_to" uuid,
    "escalation_level" integer default 1,
    "resolution_notes" text,
    "audit_trail" jsonb default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "resolved_at" timestamp with time zone
);


alter table "public"."watchdog_incidents" enable row level security;

alter sequence "public"."chunks_id_seq" owned by "public"."chunks"."id";

alter sequence "public"."system_reports_id_seq" owned by "public"."system_reports"."id";

CREATE UNIQUE INDEX adaptive_learning_metrics_pkey ON public.adaptive_learning_metrics USING btree (id);

CREATE UNIQUE INDEX admin_activity_log_pkey ON public.admin_activity_log USING btree (id);

CREATE UNIQUE INDEX admin_approval_requests_pkey ON public.admin_approval_requests USING btree (id);

CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (id);

CREATE UNIQUE INDEX admin_users_user_id_key ON public.admin_users USING btree (user_id);

CREATE UNIQUE INDEX ai_behavior_monitoring_pkey ON public.ai_behavior_monitoring USING btree (id);

CREATE UNIQUE INDEX ai_chunk_hash_stats_pkey ON public.ai_chunk_hash_stats USING btree (hash);

CREATE INDEX ai_chunks_content_trgm ON public.ai_document_chunks USING gin (content gin_trgm_ops);

CREATE UNIQUE INDEX ai_chunks_document_chunk_unique ON public.ai_document_chunks USING btree (document_id, chunk_index);

CREATE INDEX ai_chunks_layer_idx ON public.ai_document_chunks USING btree (layer) WHERE (layer IS NOT NULL);

CREATE INDEX ai_chunks_org_idx ON public.ai_document_chunks USING btree (organization_id);

CREATE INDEX ai_chunks_stage_idx ON public.ai_document_chunks USING btree (stage) WHERE (stage IS NOT NULL);

CREATE INDEX ai_chunks_tags_gin ON public.ai_document_chunks USING gin (tags);

CREATE UNIQUE INDEX ai_confidence_scoring_pkey ON public.ai_confidence_scoring USING btree (id);

CREATE INDEX ai_docs_doc_type_idx ON public.ai_documents USING btree (doc_type) WHERE (doc_type IS NOT NULL);

CREATE INDEX ai_docs_layer_idx ON public.ai_documents USING btree (layer) WHERE (layer IS NOT NULL);

CREATE INDEX ai_docs_metadata_gin ON public.ai_documents USING gin (metadata);

CREATE INDEX ai_docs_org_idx ON public.ai_documents USING btree (organization_id);

CREATE INDEX ai_docs_processing_status_idx ON public.ai_documents USING btree (processing_status);

CREATE INDEX ai_docs_stage_idx ON public.ai_documents USING btree (stage) WHERE (stage IS NOT NULL);

CREATE INDEX ai_docs_tags_gin ON public.ai_documents USING gin (tags);

CREATE UNIQUE INDEX ai_document_chunks_pkey ON public.ai_document_chunks USING btree (id);

CREATE UNIQUE INDEX ai_document_versions_pkey ON public.ai_document_versions USING btree (id);

CREATE UNIQUE INDEX ai_documents_pkey ON public.ai_documents USING btree (id);

CREATE UNIQUE INDEX ai_feedback_log_pkey ON public.ai_feedback_log USING btree (id);

CREATE UNIQUE INDEX ai_feedback_loop_log_pkey ON public.ai_feedback_loop_log USING btree (id);

CREATE UNIQUE INDEX ai_feedback_submissions_pkey ON public.ai_feedback_submissions USING btree (id);

CREATE UNIQUE INDEX ai_learning_patterns_pkey ON public.ai_learning_patterns USING btree (id);

CREATE UNIQUE INDEX ai_upload_audit_pkey ON public.ai_upload_audit USING btree (id);

CREATE UNIQUE INDEX api_usage_log_pkey ON public.api_usage_log USING btree (id);

CREATE UNIQUE INDEX approval_requests_pkey ON public.approval_requests USING btree (id);

CREATE UNIQUE INDEX approved_chunks_cache_pkey ON public.approved_chunks_cache USING btree (id);

CREATE UNIQUE INDEX assessment_scores_assessment_id_criteria_id_key ON public.assessment_scores USING btree (assessment_id, criteria_id);

CREATE UNIQUE INDEX assessment_scores_pkey ON public.assessment_scores USING btree (id);

CREATE UNIQUE INDEX assessments_pkey ON public.assessments USING btree (id);

CREATE UNIQUE INDEX audit_trail_pkey ON public.audit_trail USING btree (id);

CREATE UNIQUE INDEX auditor_assignments_assessment_id_auditor_id_key ON public.auditor_assignments USING btree (assessment_id, auditor_id);

CREATE UNIQUE INDEX auditor_assignments_pkey ON public.auditor_assignments USING btree (id);

CREATE UNIQUE INDEX backoffice_admins_pkey ON public.backoffice_admins USING btree (id);

CREATE UNIQUE INDEX backoffice_admins_user_id_key ON public.backoffice_admins USING btree (user_id);

CREATE INDEX chunks_embedding_ivfflat ON public.chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE UNIQUE INDEX chunks_pkey ON public.chunks USING btree (id);

CREATE UNIQUE INDEX conversation_history_pkey ON public.conversation_history USING btree (id);

CREATE UNIQUE INDEX criteria_deferrals_pkey ON public.criteria_deferrals USING btree (id);

CREATE UNIQUE INDEX criteria_edit_history_pkey ON public.criteria_edit_history USING btree (id);

CREATE UNIQUE INDEX criteria_organization_id_criteria_number_key ON public.criteria USING btree (organization_id, criteria_number);

CREATE UNIQUE INDEX criteria_pkey ON public.criteria USING btree (id);

CREATE UNIQUE INDEX criteria_rejections_pkey ON public.criteria_rejections USING btree (id);

CREATE UNIQUE INDEX cross_org_tracking_pkey ON public.cross_org_tracking USING btree (id);

CREATE UNIQUE INDEX data_source_sync_logs_pkey ON public.data_source_sync_logs USING btree (id);

CREATE UNIQUE INDEX data_sources_organization_id_source_name_key ON public.data_sources USING btree (organization_id, source_name);

CREATE UNIQUE INDEX data_sources_pkey ON public.data_sources USING btree (id);

CREATE UNIQUE INDEX deduplication_reports_pkey ON public.deduplication_reports USING btree (id);

CREATE UNIQUE INDEX discount_codes_code_key ON public.discount_codes USING btree (code);

CREATE UNIQUE INDEX discount_codes_pkey ON public.discount_codes USING btree (id);

CREATE UNIQUE INDEX document_types_pkey ON public.document_types USING btree (name);

CREATE UNIQUE INDEX domains_org_code_key ON public.domains USING btree (organization_id, code);

CREATE UNIQUE INDEX domains_pkey ON public.domains USING btree (id);

CREATE UNIQUE INDEX evidence_pkey ON public.evidence USING btree (id);

CREATE UNIQUE INDEX evidence_submissions_pkey ON public.evidence_submissions USING btree (id);

CREATE UNIQUE INDEX external_insights_pkey ON public.external_insights USING btree (id);

CREATE UNIQUE INDEX feedback_retraining_weights_organization_id_feedback_type_f_key ON public.feedback_retraining_weights USING btree (organization_id, feedback_type, feedback_category);

CREATE UNIQUE INDEX feedback_retraining_weights_pkey ON public.feedback_retraining_weights USING btree (id);

CREATE UNIQUE INDEX gap_tickets_pkey ON public.gap_tickets USING btree (id);

CREATE UNIQUE INDEX human_approval_workflows_pkey ON public.human_approval_workflows USING btree (id);

CREATE INDEX idx_ai_behavior_monitoring_org_type ON public.ai_behavior_monitoring USING btree (organization_id, behavior_type);

CREATE INDEX idx_ai_confidence_scoring_org_category ON public.ai_confidence_scoring USING btree (organization_id, confidence_category);

CREATE INDEX idx_ai_docs_active_private ON public.ai_documents USING btree (status, visibility) WHERE ((status = 'active'::text) AND (visibility = 'private'::text));

CREATE INDEX idx_ai_document_chunks_doc_id ON public.ai_document_chunks USING btree (document_id);

CREATE INDEX idx_ai_document_chunks_embedding_hnsw ON public.ai_document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64');

CREATE INDEX idx_ai_document_chunks_org_id ON public.ai_document_chunks USING btree (organization_id);

CREATE INDEX idx_ai_document_versions_created_at ON public.ai_document_versions USING btree (created_at DESC);

CREATE INDEX idx_ai_document_versions_document_id ON public.ai_document_versions USING btree (document_id);

CREATE INDEX idx_ai_document_versions_org_id ON public.ai_document_versions USING btree (organization_id);

CREATE INDEX idx_ai_documents_active ON public.ai_documents USING btree (organization_id, created_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_ai_documents_context ON public.ai_documents USING btree (context_level, target_organization_id);

CREATE INDEX idx_ai_documents_created ON public.ai_documents USING btree (created_at DESC);

CREATE INDEX idx_ai_documents_deleted_at ON public.ai_documents USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

CREATE INDEX idx_ai_documents_doctype ON public.ai_documents USING btree (document_type);

CREATE INDEX idx_ai_documents_domain ON public.ai_documents USING btree (domain);

CREATE INDEX idx_ai_documents_is_ai_ingested ON public.ai_documents USING btree (is_ai_ingested, processing_status, organization_id);

CREATE INDEX idx_ai_documents_org_id ON public.ai_documents USING btree (organization_id);

CREATE INDEX idx_ai_documents_processing_version ON public.ai_documents USING btree (processing_version);

CREATE INDEX idx_ai_documents_schema_version ON public.ai_documents USING btree (schema_version);

CREATE INDEX idx_ai_documents_status ON public.ai_documents USING btree (processing_status);

CREATE INDEX idx_ai_documents_tags ON public.ai_documents USING gin (tags);

CREATE INDEX idx_ai_feedback_log_created_at ON public.ai_feedback_log USING btree (created_at DESC);

CREATE INDEX idx_ai_feedback_log_feedback_type ON public.ai_feedback_log USING btree (feedback_type);

CREATE INDEX idx_ai_feedback_log_org_id ON public.ai_feedback_log USING btree (organization_id);

CREATE INDEX idx_ai_feedback_log_user_id ON public.ai_feedback_log USING btree (user_id);

CREATE INDEX idx_ai_feedback_loop_org_type ON public.ai_feedback_loop_log USING btree (organization_id, feedback_type);

CREATE INDEX idx_ai_feedback_submissions_created_at ON public.ai_feedback_submissions USING btree (created_at);

CREATE INDEX idx_ai_feedback_submissions_criteria_id ON public.ai_feedback_submissions USING btree (criteria_id);

CREATE INDEX idx_ai_feedback_submissions_document_id ON public.ai_feedback_submissions USING btree (document_id);

CREATE INDEX idx_ai_feedback_submissions_feedback_type ON public.ai_feedback_submissions USING btree (feedback_type);

CREATE INDEX idx_ai_feedback_submissions_org_id ON public.ai_feedback_submissions USING btree (organization_id);

CREATE INDEX idx_ai_feedback_submissions_user_id ON public.ai_feedback_submissions USING btree (user_id);

CREATE INDEX idx_ai_upload_audit_org_id ON public.ai_upload_audit USING btree (organization_id);

CREATE INDEX idx_api_usage_log_created_at ON public.api_usage_log USING btree (created_at);

CREATE INDEX idx_api_usage_log_org_endpoint ON public.api_usage_log USING btree (organization_id, endpoint);

CREATE INDEX idx_approval_requests_entity ON public.approval_requests USING btree (entity_type, entity_id);

CREATE INDEX idx_approval_requests_organization_id ON public.approval_requests USING btree (organization_id);

CREATE INDEX idx_approved_chunks_document_id ON public.approved_chunks_cache USING btree (document_id);

CREATE INDEX idx_approved_chunks_org_id ON public.approved_chunks_cache USING btree (organization_id);

CREATE INDEX idx_assessment_scores_assessment_id ON public.assessment_scores USING btree (assessment_id);

CREATE INDEX idx_assessment_scores_assessment_status ON public.assessment_scores USING btree (assessment_id, status);

CREATE INDEX idx_assessment_scores_criteria_id ON public.assessment_scores USING btree (criteria_id);

CREATE INDEX idx_assessments_organization_status ON public.assessments USING btree (organization_id, status);

CREATE INDEX idx_audit_trail_changed_at ON public.audit_trail USING btree (changed_at);

CREATE INDEX idx_audit_trail_organization_id ON public.audit_trail USING btree (organization_id);

CREATE INDEX idx_audit_trail_organization_table ON public.audit_trail USING btree (organization_id, table_name, changed_at);

CREATE INDEX idx_audit_trail_table_record ON public.audit_trail USING btree (table_name, record_id);

CREATE INDEX idx_auditor_assignments_assessment_id ON public.auditor_assignments USING btree (assessment_id);

CREATE INDEX idx_auditor_assignments_organization_id ON public.auditor_assignments USING btree (organization_id);

CREATE INDEX idx_chunks_checksum ON public.ai_document_chunks USING btree (checksum);

CREATE INDEX idx_chunks_content_hash ON public.ai_document_chunks USING btree (content_hash);

CREATE INDEX idx_chunks_doc_id_non_boilerplate ON public.ai_document_chunks USING btree (document_id, chunk_index) WHERE (COALESCE((metadata ->> 'boilerplate'::text), 'false'::text) <> 'true'::text);

CREATE UNIQUE INDEX idx_chunks_document_chunk_unique ON public.ai_document_chunks USING btree (document_id, chunk_index);

CREATE INDEX idx_chunks_document_id ON public.ai_document_chunks USING btree (document_id);

CREATE INDEX idx_chunks_metadata_gin ON public.ai_document_chunks USING gin (metadata);

CREATE INDEX idx_chunks_organization_id ON public.ai_document_chunks USING btree (organization_id);

CREATE INDEX idx_chunks_page ON public.ai_document_chunks USING btree (page);

CREATE INDEX idx_chunks_status ON public.ai_document_chunks USING btree (status);

CREATE INDEX idx_chunks_tags_gin ON public.ai_document_chunks USING gin (tags);

CREATE INDEX idx_chunks_visibility ON public.ai_document_chunks USING btree (visibility);

CREATE INDEX idx_conversation_history_org_created ON public.conversation_history USING btree (organization_id, created_at DESC);

CREATE INDEX idx_criteria_deferrals_organization_id ON public.criteria_deferrals USING btree (organization_id);

CREATE INDEX idx_criteria_deferrals_proposed_criteria_id ON public.criteria_deferrals USING btree (proposed_criteria_id);

CREATE INDEX idx_criteria_deferrals_suggested_domain ON public.criteria_deferrals USING btree (suggested_domain);

CREATE INDEX idx_criteria_deferrals_suggested_mps ON public.criteria_deferrals USING btree (suggested_mps_number);

CREATE INDEX idx_criteria_edit_history_criteria_id ON public.criteria_edit_history USING btree (criteria_id);

CREATE INDEX idx_criteria_edit_history_organization_id ON public.criteria_edit_history USING btree (organization_id);

CREATE INDEX idx_criteria_mps_id ON public.criteria USING btree (mps_id);

CREATE INDEX idx_criteria_number ON public.criteria USING btree (organization_id, criteria_number);

CREATE INDEX idx_criteria_organization_id ON public.criteria USING btree (organization_id);

CREATE INDEX idx_criteria_rejections_criteria_id ON public.criteria_rejections USING btree (criteria_id);

CREATE INDEX idx_criteria_rejections_organization_id ON public.criteria_rejections USING btree (organization_id);

CREATE INDEX idx_cross_org_tracking_hash ON public.cross_org_tracking USING btree (content_hash);

CREATE INDEX idx_data_source_sync_logs_source_id ON public.data_source_sync_logs USING btree (data_source_id);

CREATE INDEX idx_data_sources_org_id ON public.data_sources USING btree (organization_id);

CREATE INDEX idx_data_sources_sync_status ON public.data_sources USING btree (sync_status) WHERE (is_active = true);

CREATE INDEX idx_data_sources_type_active ON public.data_sources USING btree (source_type, is_active);

CREATE INDEX idx_deduplication_reports_org_generated ON public.deduplication_reports USING btree (organization_id, generated_at);

CREATE INDEX idx_domains_organization_id ON public.domains USING btree (organization_id);

CREATE INDEX idx_domains_status ON public.domains USING btree (status);

CREATE INDEX idx_evidence_assessment_id ON public.evidence USING btree (assessment_id);

CREATE INDEX idx_evidence_assessment_type ON public.evidence USING btree (assessment_id, evidence_type);

CREATE INDEX idx_evidence_criteria_id ON public.evidence USING btree (criteria_id);

CREATE INDEX idx_evidence_organization_id ON public.evidence USING btree (organization_id);

CREATE INDEX idx_evidence_submissions_criteria ON public.evidence_submissions USING btree (criteria_id);

CREATE INDEX idx_evidence_submissions_data_source ON public.evidence_submissions USING btree (data_source_id);

CREATE INDEX idx_evidence_submissions_org_id ON public.evidence_submissions USING btree (organization_id);

CREATE INDEX idx_evidence_submissions_status ON public.evidence_submissions USING btree (evaluation_status);

CREATE INDEX idx_evidence_submissions_submitted_at ON public.evidence_submissions USING btree (submitted_at);

CREATE INDEX idx_external_insights_industry_tags ON public.external_insights USING gin (industry_tags);

CREATE INDEX idx_external_insights_matched_orgs ON public.external_insights USING gin (matched_orgs);

CREATE INDEX idx_external_insights_profile_match ON public.external_insights USING gin (industry_tags, region_tags, threat_tags);

CREATE INDEX idx_external_insights_published_at ON public.external_insights USING btree (published_at DESC);

CREATE INDEX idx_external_insights_region_tags ON public.external_insights USING gin (region_tags);

CREATE INDEX idx_external_insights_risk_level ON public.external_insights USING btree (risk_level);

CREATE INDEX idx_external_insights_threat_tags ON public.external_insights USING gin (threat_tags);

CREATE INDEX idx_external_insights_verified ON public.external_insights USING btree (is_verified);

CREATE INDEX idx_external_insights_visibility_scope ON public.external_insights USING btree (visibility_scope);

CREATE INDEX idx_feedback_retraining_weights_org_id ON public.feedback_retraining_weights USING btree (organization_id);

CREATE INDEX idx_feedback_retraining_weights_type_category ON public.feedback_retraining_weights USING btree (feedback_type, feedback_category);

CREATE INDEX idx_gap_tickets_follow_up_date ON public.gap_tickets USING btree (follow_up_date) WHERE (status = ANY (ARRAY['pending'::text, 'scheduled'::text]));

CREATE INDEX idx_gap_tickets_org_status ON public.gap_tickets USING btree (organization_id, status);

CREATE INDEX idx_human_approval_workflows_entity ON public.human_approval_workflows USING btree (entity_type, entity_id);

CREATE INDEX idx_human_approval_workflows_org_id ON public.human_approval_workflows USING btree (organization_id);

CREATE INDEX idx_human_approval_workflows_primary_reviewer ON public.human_approval_workflows USING btree (primary_reviewer_id);

CREATE INDEX idx_human_approval_workflows_secondary_reviewer ON public.human_approval_workflows USING btree (secondary_reviewer_id);

CREATE INDEX idx_human_approval_workflows_status ON public.human_approval_workflows USING btree (workflow_status);

CREATE INDEX idx_learning_feedback_org_type ON public.learning_feedback_log USING btree (organization_id, feedback_type);

CREATE INDEX idx_learning_feedback_validation ON public.learning_feedback_log USING btree (validation_status, applied_to_model);

CREATE INDEX idx_learning_metrics_org_period ON public.adaptive_learning_metrics USING btree (organization_id, measurement_period_start, measurement_period_end);

CREATE INDEX idx_learning_metrics_type_category ON public.adaptive_learning_metrics USING btree (metric_type, metric_category);

CREATE INDEX idx_learning_patterns_active ON public.ai_learning_patterns USING btree (is_active, validation_status);

CREATE INDEX idx_learning_patterns_confidence ON public.ai_learning_patterns USING btree (confidence_score DESC);

CREATE INDEX idx_learning_patterns_frequency ON public.ai_learning_patterns USING btree (frequency_count DESC);

CREATE INDEX idx_learning_patterns_org_type ON public.ai_learning_patterns USING btree (organization_id, pattern_type);

CREATE INDEX idx_learning_rules_org_enabled ON public.learning_rule_configurations USING btree (organization_id, is_enabled);

CREATE INDEX idx_learning_rules_priority ON public.learning_rule_configurations USING btree (priority_level DESC);

CREATE INDEX idx_learning_rules_type_category ON public.learning_rule_configurations USING btree (rule_type, rule_category);

CREATE INDEX idx_maturity_levels_criteria_id ON public.maturity_levels USING btree (criteria_id);

CREATE INDEX idx_migration_status ON public.migration_status USING btree (status);

CREATE INDEX idx_milestone_status_history_entity ON public.milestone_status_history USING btree (entity_type, entity_id);

CREATE INDEX idx_milestone_status_history_organization_id ON public.milestone_status_history USING btree (organization_id);

CREATE INDEX idx_milestone_tasks_display_order ON public.milestone_tasks USING btree (display_order);

CREATE INDEX idx_milestone_tasks_milestone_id ON public.milestone_tasks USING btree (milestone_id);

CREATE INDEX idx_milestone_tasks_organization_id ON public.milestone_tasks USING btree (organization_id);

CREATE INDEX idx_milestone_tasks_status ON public.milestone_tasks USING btree (status);

CREATE INDEX idx_milestone_test_notes_organization_id ON public.milestone_test_notes USING btree (organization_id);

CREATE INDEX idx_milestone_test_notes_task_id ON public.milestone_test_notes USING btree (milestone_task_id);

CREATE INDEX idx_milestones_display_order ON public.milestones USING btree (display_order);

CREATE INDEX idx_milestones_organization_id ON public.milestones USING btree (organization_id);

CREATE INDEX idx_milestones_status ON public.milestones USING btree (status);

CREATE INDEX idx_model_snapshots_baseline ON public.learning_model_snapshots USING btree (organization_id, is_baseline);

CREATE INDEX idx_model_snapshots_org_time ON public.learning_model_snapshots USING btree (organization_id, created_at DESC);

CREATE INDEX idx_mps_domain_id ON public.maturity_practice_statements USING btree (domain_id);

CREATE INDEX idx_mps_number ON public.maturity_practice_statements USING btree (organization_id, mps_number);

CREATE INDEX idx_mps_organization_id ON public.maturity_practice_statements USING btree (organization_id);

CREATE UNIQUE INDEX idx_one_primary_org_per_owner ON public.organizations USING btree (owner_id) WHERE (organization_type = 'primary'::text);

CREATE INDEX idx_org_crawl_queue_org_status_pri ON public.org_crawl_queue USING btree (org_id, status, priority DESC);

CREATE INDEX idx_org_crawl_queue_org_status_priority ON public.org_crawl_queue USING btree (org_id, status, priority DESC);

CREATE INDEX idx_org_crawl_queue_org_url ON public.org_crawl_queue USING btree (org_id, url);

CREATE INDEX idx_org_crawl_queue_status_priority ON public.org_crawl_queue USING btree (status, priority DESC, created_at DESC);

CREATE INDEX idx_org_docs_org_created_at ON public.organization_documents USING btree (org_id, created_at DESC);

CREATE INDEX idx_org_docs_org_status ON public.organization_documents USING btree (org_id, status);

CREATE INDEX idx_org_docs_pending ON public.organization_documents USING btree (org_id, status) WHERE (status = 'pending'::doc_status);

CREATE INDEX idx_org_domains_organization_id ON public.org_domains USING btree (organization_id);

CREATE INDEX idx_org_ingest_jobs_created_at ON public.org_ingest_jobs USING btree (created_at DESC);

CREATE INDEX idx_org_page_chunks_embedding ON public.org_page_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_org_page_chunks_org_created ON public.org_page_chunks USING btree (org_id, created_at);

CREATE INDEX idx_org_pages_html_hash ON public.org_pages USING btree (html_hash);

CREATE INDEX idx_org_pages_org_domain ON public.org_pages USING btree (org_id, domain);

CREATE INDEX idx_org_pages_org_fetched_at ON public.org_pages USING btree (org_id, fetched_at);

CREATE INDEX idx_organization_members_user_org_role ON public.organization_members USING btree (user_id, organization_id, role);

CREATE INDEX idx_organizations_industry_tags ON public.organizations USING gin (industry_tags);

CREATE INDEX idx_organizations_parent ON public.organizations USING btree (parent_organization_id);

CREATE INDEX idx_organizations_region_operating ON public.organizations USING btree (region_operating);

CREATE INDEX idx_organizations_risk_concerns ON public.organizations USING gin (risk_concerns);

CREATE INDEX idx_organizations_threat_sensitivity ON public.organizations USING btree (threat_sensitivity_level);

CREATE INDEX idx_pattern_history_org_type ON public.pattern_recognition_history USING btree (organization_id, analysis_type);

CREATE INDEX idx_pattern_history_pattern_time ON public.pattern_recognition_history USING btree (pattern_id, created_at DESC);

CREATE INDEX idx_policy_change_log_created_at ON public.policy_change_log USING btree (created_at DESC);

CREATE INDEX idx_policy_change_log_domain_scope ON public.policy_change_log USING btree (domain_scope);

CREATE INDEX idx_policy_change_log_tags ON public.policy_change_log USING gin (tags);

CREATE INDEX idx_policy_change_log_type ON public.policy_change_log USING btree (type);

CREATE INDEX idx_processing_pipeline_status_document_id ON public.processing_pipeline_status USING btree (document_id);

CREATE INDEX idx_processing_pipeline_status_org_status ON public.processing_pipeline_status USING btree (organization_id, status);

CREATE INDEX idx_qa_alerts_organization_unread ON public.qa_alerts USING btree (organization_id, is_read) WHERE (NOT is_read);

CREATE INDEX idx_qa_alerts_severity_unresolved ON public.qa_alerts USING btree (severity_level, is_resolved) WHERE (NOT is_resolved);

CREATE INDEX idx_qa_alerts_slack_pending ON public.qa_alerts USING btree (slack_sent, created_at) WHERE (NOT slack_sent);

CREATE INDEX idx_qa_metrics_org_type_time ON public.qa_metrics USING btree (organization_id, metric_type, recorded_at);

CREATE INDEX idx_qa_rules_organization_active ON public.qa_rules USING btree (organization_id, is_active);

CREATE INDEX idx_qa_rules_type_severity ON public.qa_rules USING btree (rule_type, severity_level);

CREATE INDEX idx_qa_test_log_mps_test_type ON public.qa_test_log USING btree (mps_number, test_type, run_at DESC);

CREATE INDEX idx_qa_test_log_org_run_at ON public.qa_test_log USING btree (organization_id, run_at DESC);

CREATE INDEX idx_qa_test_log_run_type ON public.qa_test_log USING btree (run_type, run_at DESC);

CREATE INDEX idx_refactor_qa_log_acknowledged ON public.refactor_qa_log USING btree (acknowledged, run_at DESC);

CREATE INDEX idx_refactor_qa_log_org_run_at ON public.refactor_qa_log USING btree (organization_id, run_at DESC);

CREATE INDEX idx_refactor_qa_log_severity ON public.refactor_qa_log USING btree (severity, run_at DESC);

CREATE INDEX idx_security_configuration_setting_name ON public.security_configuration USING btree (setting_name);

CREATE INDEX idx_security_monitoring_metric_type ON public.security_monitoring USING btree (metric_type);

CREATE INDEX idx_security_monitoring_organization_id ON public.security_monitoring USING btree (organization_id);

CREATE INDEX idx_security_monitoring_recorded_at ON public.security_monitoring USING btree (recorded_at);

CREATE INDEX idx_system_drift_detection_org_type ON public.system_drift_detection USING btree (organization_id, drift_type);

CREATE INDEX idx_upload_session_log_org_user ON public.upload_session_log USING btree (organization_id, user_id);

CREATE INDEX idx_watchdog_alerts_org_severity ON public.watchdog_alerts USING btree (organization_id, severity_level);

CREATE INDEX idx_watchdog_incidents_org_status ON public.watchdog_incidents USING btree (organization_id, status);

CREATE UNIQUE INDEX learning_feedback_log_pkey ON public.learning_feedback_log USING btree (id);

CREATE UNIQUE INDEX learning_model_snapshots_pkey ON public.learning_model_snapshots USING btree (id);

CREATE UNIQUE INDEX learning_rule_configurations_pkey ON public.learning_rule_configurations USING btree (id);

CREATE UNIQUE INDEX maturity_levels_criteria_id_level_key ON public.maturity_levels USING btree (criteria_id, level);

CREATE UNIQUE INDEX maturity_levels_pkey ON public.maturity_levels USING btree (id);

CREATE UNIQUE INDEX maturity_practice_statements_organization_id_mps_number_key ON public.maturity_practice_statements USING btree (organization_id, mps_number);

CREATE UNIQUE INDEX maturity_practice_statements_pkey ON public.maturity_practice_statements USING btree (id);

CREATE UNIQUE INDEX migration_status_migration_name_key ON public.migration_status USING btree (migration_name);

CREATE UNIQUE INDEX migration_status_pkey ON public.migration_status USING btree (id);

CREATE UNIQUE INDEX milestone_status_history_pkey ON public.milestone_status_history USING btree (id);

CREATE UNIQUE INDEX milestone_tasks_pkey ON public.milestone_tasks USING btree (id);

CREATE UNIQUE INDEX milestone_test_notes_pkey ON public.milestone_test_notes USING btree (id);

CREATE UNIQUE INDEX milestones_pkey ON public.milestones USING btree (id);

CREATE UNIQUE INDEX org_crawl_queue_pkey ON public.org_crawl_queue USING btree (id);

CREATE UNIQUE INDEX org_crawl_queue_unique ON public.org_crawl_queue USING btree (org_id, url);

CREATE UNIQUE INDEX org_domains_org_id_domain_uidx ON public.org_domains USING btree (org_id, domain);

CREATE UNIQUE INDEX org_domains_pkey ON public.org_domains USING btree (id);

CREATE UNIQUE INDEX org_domains_unique ON public.org_domains USING btree (org_id, domain);

CREATE UNIQUE INDEX org_ingest_jobs_pkey ON public.org_ingest_jobs USING btree (id);

CREATE UNIQUE INDEX org_page_chunks_pkey ON public.org_page_chunks USING btree (id);

CREATE UNIQUE INDEX org_page_chunks_unique ON public.org_page_chunks USING btree (page_id, chunk_idx);

CREATE UNIQUE INDEX org_pages_pkey ON public.org_pages USING btree (id);

CREATE UNIQUE INDEX org_pages_unique ON public.org_pages USING btree (org_id, url);

CREATE UNIQUE INDEX org_profiles_org_id_key ON public.org_profiles USING btree (org_id);

CREATE UNIQUE INDEX org_profiles_pkey ON public.org_profiles USING btree (id);

CREATE UNIQUE INDEX organization_documents_pkey ON public.organization_documents USING btree (id);

CREATE UNIQUE INDEX organization_invitations_invitation_token_key ON public.organization_invitations USING btree (invitation_token);

CREATE UNIQUE INDEX organization_invitations_pkey ON public.organization_invitations USING btree (id);

CREATE UNIQUE INDEX organization_members_organization_id_user_id_key ON public.organization_members USING btree (organization_id, user_id);

CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX override_approvals_pkey ON public.override_approvals USING btree (id);

CREATE UNIQUE INDEX pattern_recognition_history_pkey ON public.pattern_recognition_history USING btree (id);

CREATE UNIQUE INDEX policy_change_log_pkey ON public.policy_change_log USING btree (id);

CREATE UNIQUE INDEX processing_pipeline_status_pkey ON public.processing_pipeline_status USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX qa_alerts_pkey ON public.qa_alerts USING btree (id);

CREATE UNIQUE INDEX qa_metrics_pkey ON public.qa_metrics USING btree (id);

CREATE UNIQUE INDEX qa_rules_pkey ON public.qa_rules USING btree (id);

CREATE UNIQUE INDEX qa_test_log_pkey ON public.qa_test_log USING btree (id);

CREATE UNIQUE INDEX refactor_qa_log_pkey ON public.refactor_qa_log USING btree (id);

CREATE UNIQUE INDEX security_configuration_pkey ON public.security_configuration USING btree (id);

CREATE UNIQUE INDEX security_configuration_setting_name_key ON public.security_configuration USING btree (setting_name);

CREATE UNIQUE INDEX security_exceptions_pkey ON public.security_exceptions USING btree (id);

CREATE UNIQUE INDEX security_monitoring_pkey ON public.security_monitoring USING btree (id);

CREATE UNIQUE INDEX security_rate_limits_pkey ON public.security_rate_limits USING btree (id);

CREATE UNIQUE INDEX subscription_modules_pkey ON public.subscription_modules USING btree (id);

CREATE UNIQUE INDEX subscription_modules_slug_key ON public.subscription_modules USING btree (slug);

CREATE UNIQUE INDEX system_drift_detection_pkey ON public.system_drift_detection USING btree (id);

CREATE UNIQUE INDEX system_reports_pkey ON public.system_reports USING btree (id);

CREATE UNIQUE INDEX uidx_org_docs_path ON public.organization_documents USING btree (org_id, source_object_path);

CREATE UNIQUE INDEX unique_document_version ON public.ai_document_versions USING btree (document_id, version_number);

CREATE UNIQUE INDEX unique_org_rule_name ON public.learning_rule_configurations USING btree (organization_id, rule_name);

CREATE UNIQUE INDEX unique_org_snapshot_name ON public.learning_model_snapshots USING btree (organization_id, snapshot_name);

CREATE UNIQUE INDEX unique_pending_invitation ON public.organization_invitations USING btree (organization_id, email, status);

CREATE UNIQUE INDEX unique_pending_invitations ON public.organization_invitations USING btree (organization_id, email) WHERE (status = 'pending'::invitation_status);

CREATE UNIQUE INDEX upload_session_log_pkey ON public.upload_session_log USING btree (id);

CREATE UNIQUE INDEX watchdog_alerts_pkey ON public.watchdog_alerts USING btree (id);

CREATE UNIQUE INDEX watchdog_incidents_pkey ON public.watchdog_incidents USING btree (id);

alter table "public"."adaptive_learning_metrics" add constraint "adaptive_learning_metrics_pkey" PRIMARY KEY using index "adaptive_learning_metrics_pkey";

alter table "public"."admin_activity_log" add constraint "admin_activity_log_pkey" PRIMARY KEY using index "admin_activity_log_pkey";

alter table "public"."admin_approval_requests" add constraint "admin_approval_requests_pkey" PRIMARY KEY using index "admin_approval_requests_pkey";

alter table "public"."admin_users" add constraint "admin_users_pkey" PRIMARY KEY using index "admin_users_pkey";

alter table "public"."ai_behavior_monitoring" add constraint "ai_behavior_monitoring_pkey" PRIMARY KEY using index "ai_behavior_monitoring_pkey";

alter table "public"."ai_chunk_hash_stats" add constraint "ai_chunk_hash_stats_pkey" PRIMARY KEY using index "ai_chunk_hash_stats_pkey";

alter table "public"."ai_confidence_scoring" add constraint "ai_confidence_scoring_pkey" PRIMARY KEY using index "ai_confidence_scoring_pkey";

alter table "public"."ai_document_chunks" add constraint "ai_document_chunks_pkey" PRIMARY KEY using index "ai_document_chunks_pkey";

alter table "public"."ai_document_versions" add constraint "ai_document_versions_pkey" PRIMARY KEY using index "ai_document_versions_pkey";

alter table "public"."ai_documents" add constraint "ai_documents_pkey" PRIMARY KEY using index "ai_documents_pkey";

alter table "public"."ai_feedback_log" add constraint "ai_feedback_log_pkey" PRIMARY KEY using index "ai_feedback_log_pkey";

alter table "public"."ai_feedback_loop_log" add constraint "ai_feedback_loop_log_pkey" PRIMARY KEY using index "ai_feedback_loop_log_pkey";

alter table "public"."ai_feedback_submissions" add constraint "ai_feedback_submissions_pkey" PRIMARY KEY using index "ai_feedback_submissions_pkey";

alter table "public"."ai_learning_patterns" add constraint "ai_learning_patterns_pkey" PRIMARY KEY using index "ai_learning_patterns_pkey";

alter table "public"."ai_upload_audit" add constraint "ai_upload_audit_pkey" PRIMARY KEY using index "ai_upload_audit_pkey";

alter table "public"."api_usage_log" add constraint "api_usage_log_pkey" PRIMARY KEY using index "api_usage_log_pkey";

alter table "public"."approval_requests" add constraint "approval_requests_pkey" PRIMARY KEY using index "approval_requests_pkey";

alter table "public"."approved_chunks_cache" add constraint "approved_chunks_cache_pkey" PRIMARY KEY using index "approved_chunks_cache_pkey";

alter table "public"."assessment_scores" add constraint "assessment_scores_pkey" PRIMARY KEY using index "assessment_scores_pkey";

alter table "public"."assessments" add constraint "assessments_pkey" PRIMARY KEY using index "assessments_pkey";

alter table "public"."audit_trail" add constraint "audit_trail_pkey" PRIMARY KEY using index "audit_trail_pkey";

alter table "public"."auditor_assignments" add constraint "auditor_assignments_pkey" PRIMARY KEY using index "auditor_assignments_pkey";

alter table "public"."backoffice_admins" add constraint "backoffice_admins_pkey" PRIMARY KEY using index "backoffice_admins_pkey";

alter table "public"."chunks" add constraint "chunks_pkey" PRIMARY KEY using index "chunks_pkey";

alter table "public"."conversation_history" add constraint "conversation_history_pkey" PRIMARY KEY using index "conversation_history_pkey";

alter table "public"."criteria" add constraint "criteria_pkey" PRIMARY KEY using index "criteria_pkey";

alter table "public"."criteria_deferrals" add constraint "criteria_deferrals_pkey" PRIMARY KEY using index "criteria_deferrals_pkey";

alter table "public"."criteria_edit_history" add constraint "criteria_edit_history_pkey" PRIMARY KEY using index "criteria_edit_history_pkey";

alter table "public"."criteria_rejections" add constraint "criteria_rejections_pkey" PRIMARY KEY using index "criteria_rejections_pkey";

alter table "public"."cross_org_tracking" add constraint "cross_org_tracking_pkey" PRIMARY KEY using index "cross_org_tracking_pkey";

alter table "public"."data_source_sync_logs" add constraint "data_source_sync_logs_pkey" PRIMARY KEY using index "data_source_sync_logs_pkey";

alter table "public"."data_sources" add constraint "data_sources_pkey" PRIMARY KEY using index "data_sources_pkey";

alter table "public"."deduplication_reports" add constraint "deduplication_reports_pkey" PRIMARY KEY using index "deduplication_reports_pkey";

alter table "public"."discount_codes" add constraint "discount_codes_pkey" PRIMARY KEY using index "discount_codes_pkey";

alter table "public"."document_types" add constraint "document_types_pkey" PRIMARY KEY using index "document_types_pkey";

alter table "public"."domains" add constraint "domains_pkey" PRIMARY KEY using index "domains_pkey";

alter table "public"."evidence" add constraint "evidence_pkey" PRIMARY KEY using index "evidence_pkey";

alter table "public"."evidence_submissions" add constraint "evidence_submissions_pkey" PRIMARY KEY using index "evidence_submissions_pkey";

alter table "public"."external_insights" add constraint "external_insights_pkey" PRIMARY KEY using index "external_insights_pkey";

alter table "public"."feedback_retraining_weights" add constraint "feedback_retraining_weights_pkey" PRIMARY KEY using index "feedback_retraining_weights_pkey";

alter table "public"."gap_tickets" add constraint "gap_tickets_pkey" PRIMARY KEY using index "gap_tickets_pkey";

alter table "public"."human_approval_workflows" add constraint "human_approval_workflows_pkey" PRIMARY KEY using index "human_approval_workflows_pkey";

alter table "public"."learning_feedback_log" add constraint "learning_feedback_log_pkey" PRIMARY KEY using index "learning_feedback_log_pkey";

alter table "public"."learning_model_snapshots" add constraint "learning_model_snapshots_pkey" PRIMARY KEY using index "learning_model_snapshots_pkey";

alter table "public"."learning_rule_configurations" add constraint "learning_rule_configurations_pkey" PRIMARY KEY using index "learning_rule_configurations_pkey";

alter table "public"."maturity_levels" add constraint "maturity_levels_pkey" PRIMARY KEY using index "maturity_levels_pkey";

alter table "public"."maturity_practice_statements" add constraint "maturity_practice_statements_pkey" PRIMARY KEY using index "maturity_practice_statements_pkey";

alter table "public"."migration_status" add constraint "migration_status_pkey" PRIMARY KEY using index "migration_status_pkey";

alter table "public"."milestone_status_history" add constraint "milestone_status_history_pkey" PRIMARY KEY using index "milestone_status_history_pkey";

alter table "public"."milestone_tasks" add constraint "milestone_tasks_pkey" PRIMARY KEY using index "milestone_tasks_pkey";

alter table "public"."milestone_test_notes" add constraint "milestone_test_notes_pkey" PRIMARY KEY using index "milestone_test_notes_pkey";

alter table "public"."milestones" add constraint "milestones_pkey" PRIMARY KEY using index "milestones_pkey";

alter table "public"."org_crawl_queue" add constraint "org_crawl_queue_pkey" PRIMARY KEY using index "org_crawl_queue_pkey";

alter table "public"."org_domains" add constraint "org_domains_pkey" PRIMARY KEY using index "org_domains_pkey";

alter table "public"."org_ingest_jobs" add constraint "org_ingest_jobs_pkey" PRIMARY KEY using index "org_ingest_jobs_pkey";

alter table "public"."org_page_chunks" add constraint "org_page_chunks_pkey" PRIMARY KEY using index "org_page_chunks_pkey";

alter table "public"."org_pages" add constraint "org_pages_pkey" PRIMARY KEY using index "org_pages_pkey";

alter table "public"."org_profiles" add constraint "org_profiles_pkey" PRIMARY KEY using index "org_profiles_pkey";

alter table "public"."organization_documents" add constraint "organization_documents_pkey" PRIMARY KEY using index "organization_documents_pkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_pkey" PRIMARY KEY using index "organization_invitations_pkey";

alter table "public"."organization_members" add constraint "organization_members_pkey" PRIMARY KEY using index "organization_members_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."override_approvals" add constraint "override_approvals_pkey" PRIMARY KEY using index "override_approvals_pkey";

alter table "public"."pattern_recognition_history" add constraint "pattern_recognition_history_pkey" PRIMARY KEY using index "pattern_recognition_history_pkey";

alter table "public"."policy_change_log" add constraint "policy_change_log_pkey" PRIMARY KEY using index "policy_change_log_pkey";

alter table "public"."processing_pipeline_status" add constraint "processing_pipeline_status_pkey" PRIMARY KEY using index "processing_pipeline_status_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."qa_alerts" add constraint "qa_alerts_pkey" PRIMARY KEY using index "qa_alerts_pkey";

alter table "public"."qa_metrics" add constraint "qa_metrics_pkey" PRIMARY KEY using index "qa_metrics_pkey";

alter table "public"."qa_rules" add constraint "qa_rules_pkey" PRIMARY KEY using index "qa_rules_pkey";

alter table "public"."qa_test_log" add constraint "qa_test_log_pkey" PRIMARY KEY using index "qa_test_log_pkey";

alter table "public"."refactor_qa_log" add constraint "refactor_qa_log_pkey" PRIMARY KEY using index "refactor_qa_log_pkey";

alter table "public"."security_configuration" add constraint "security_configuration_pkey" PRIMARY KEY using index "security_configuration_pkey";

alter table "public"."security_exceptions" add constraint "security_exceptions_pkey" PRIMARY KEY using index "security_exceptions_pkey";

alter table "public"."security_monitoring" add constraint "security_monitoring_pkey" PRIMARY KEY using index "security_monitoring_pkey";

alter table "public"."security_rate_limits" add constraint "security_rate_limits_pkey" PRIMARY KEY using index "security_rate_limits_pkey";

alter table "public"."subscription_modules" add constraint "subscription_modules_pkey" PRIMARY KEY using index "subscription_modules_pkey";

alter table "public"."system_drift_detection" add constraint "system_drift_detection_pkey" PRIMARY KEY using index "system_drift_detection_pkey";

alter table "public"."system_reports" add constraint "system_reports_pkey" PRIMARY KEY using index "system_reports_pkey";

alter table "public"."upload_session_log" add constraint "upload_session_log_pkey" PRIMARY KEY using index "upload_session_log_pkey";

alter table "public"."watchdog_alerts" add constraint "watchdog_alerts_pkey" PRIMARY KEY using index "watchdog_alerts_pkey";

alter table "public"."watchdog_incidents" add constraint "watchdog_incidents_pkey" PRIMARY KEY using index "watchdog_incidents_pkey";

alter table "public"."adaptive_learning_metrics" add constraint "fk_learning_metrics_organization" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."adaptive_learning_metrics" validate constraint "fk_learning_metrics_organization";

alter table "public"."admin_approval_requests" add constraint "admin_approval_requests_request_type_check" CHECK ((request_type = ANY (ARRAY['price_change'::text, 'discount_code'::text, 'module_activation'::text]))) not valid;

alter table "public"."admin_approval_requests" validate constraint "admin_approval_requests_request_type_check";

alter table "public"."admin_approval_requests" add constraint "admin_approval_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))) not valid;

alter table "public"."admin_approval_requests" validate constraint "admin_approval_requests_status_check";

alter table "public"."admin_users" add constraint "admin_users_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) not valid;

alter table "public"."admin_users" validate constraint "admin_users_granted_by_fkey";

alter table "public"."admin_users" add constraint "admin_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin_users" validate constraint "admin_users_user_id_fkey";

alter table "public"."admin_users" add constraint "admin_users_user_id_key" UNIQUE using index "admin_users_user_id_key";

alter table "public"."ai_behavior_monitoring" add constraint "ai_behavior_monitoring_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) not valid;

alter table "public"."ai_behavior_monitoring" validate constraint "ai_behavior_monitoring_criteria_id_fkey";

alter table "public"."ai_behavior_monitoring" add constraint "ai_behavior_monitoring_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) not valid;

alter table "public"."ai_behavior_monitoring" validate constraint "ai_behavior_monitoring_document_id_fkey";

alter table "public"."ai_confidence_scoring" add constraint "ai_confidence_scoring_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) not valid;

alter table "public"."ai_confidence_scoring" validate constraint "ai_confidence_scoring_assessment_id_fkey";

alter table "public"."ai_confidence_scoring" add constraint "ai_confidence_scoring_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) not valid;

alter table "public"."ai_confidence_scoring" validate constraint "ai_confidence_scoring_criteria_id_fkey";

alter table "public"."ai_confidence_scoring" add constraint "ai_confidence_scoring_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) not valid;

alter table "public"."ai_confidence_scoring" validate constraint "ai_confidence_scoring_document_id_fkey";

alter table "public"."ai_document_chunks" add constraint "ai_document_chunks_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE not valid;

alter table "public"."ai_document_chunks" validate constraint "ai_document_chunks_document_id_fkey";

alter table "public"."ai_document_versions" add constraint "ai_document_versions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE not valid;

alter table "public"."ai_document_versions" validate constraint "ai_document_versions_document_id_fkey";

alter table "public"."ai_document_versions" add constraint "ai_document_versions_document_type_fkey" FOREIGN KEY (document_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."ai_document_versions" validate constraint "ai_document_versions_document_type_fkey";

alter table "public"."ai_document_versions" add constraint "unique_document_version" UNIQUE using index "unique_document_version";

alter table "public"."ai_documents" add constraint "ai_documents_context_level_check" CHECK ((context_level = ANY (ARRAY['global'::text, 'organization'::text, 'subsidiary'::text]))) not valid;

alter table "public"."ai_documents" validate constraint "ai_documents_context_level_check";

alter table "public"."ai_documents" add constraint "ai_documents_document_type_fkey" FOREIGN KEY (document_type) REFERENCES document_types(name) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."ai_documents" validate constraint "ai_documents_document_type_fkey";

alter table "public"."ai_documents" add constraint "ai_documents_processing_status_check" CHECK ((processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'archived'::text]))) not valid;

alter table "public"."ai_documents" validate constraint "ai_documents_processing_status_check";

alter table "public"."ai_documents" add constraint "ai_documents_target_organization_id_fkey" FOREIGN KEY (target_organization_id) REFERENCES organizations(id) not valid;

alter table "public"."ai_documents" validate constraint "ai_documents_target_organization_id_fkey";

alter table "public"."ai_documents" add constraint "ai_documents_visibility_check" CHECK ((((metadata ->> 'visibility'::text) = ANY (ARRAY['all_users'::text, 'superusers_only'::text, 'ai_only'::text])) OR ((metadata ->> 'visibility'::text) IS NULL))) not valid;

alter table "public"."ai_documents" validate constraint "ai_documents_visibility_check";

alter table "public"."ai_documents" add constraint "chk_completed_has_type_and_chunks" CHECK (((processing_status <> 'completed'::text) OR ((total_chunks > 0) AND (doc_type IS NOT NULL) AND (doc_type <> ''::text)))) not valid;

alter table "public"."ai_documents" validate constraint "chk_completed_has_type_and_chunks";

alter table "public"."ai_feedback_log" add constraint "ai_feedback_log_feedback_type_check" CHECK ((feedback_type = ANY (ARRAY['rejection'::text, 'modification'::text, 'sector_misalignment'::text]))) not valid;

alter table "public"."ai_feedback_log" validate constraint "ai_feedback_log_feedback_type_check";

alter table "public"."ai_feedback_submissions" add constraint "ai_feedback_submissions_confidence_rating_check" CHECK (((confidence_rating >= 1) AND (confidence_rating <= 5))) not valid;

alter table "public"."ai_feedback_submissions" validate constraint "ai_feedback_submissions_confidence_rating_check";

alter table "public"."ai_feedback_submissions" add constraint "ai_feedback_submissions_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) not valid;

alter table "public"."ai_feedback_submissions" validate constraint "ai_feedback_submissions_criteria_id_fkey";

alter table "public"."ai_feedback_submissions" add constraint "ai_feedback_submissions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) not valid;

alter table "public"."ai_feedback_submissions" validate constraint "ai_feedback_submissions_document_id_fkey";

alter table "public"."ai_feedback_submissions" add constraint "ai_feedback_submissions_feedback_category_check" CHECK ((feedback_category = ANY (ARRAY['accuracy'::text, 'grammar'::text, 'hallucination'::text, 'relevance'::text, 'completeness'::text, 'clarity'::text, 'other'::text]))) not valid;

alter table "public"."ai_feedback_submissions" validate constraint "ai_feedback_submissions_feedback_category_check";

alter table "public"."ai_feedback_submissions" add constraint "ai_feedback_submissions_feedback_type_check" CHECK ((feedback_type = ANY (ARRAY['approved'::text, 'needs_correction'::text, 'rejected'::text]))) not valid;

alter table "public"."ai_feedback_submissions" validate constraint "ai_feedback_submissions_feedback_type_check";

alter table "public"."ai_learning_patterns" add constraint "fk_learning_patterns_organization" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."ai_learning_patterns" validate constraint "fk_learning_patterns_organization";

alter table "public"."ai_upload_audit" add constraint "ai_upload_audit_action_check" CHECK ((action = ANY (ARRAY['upload'::text, 'process'::text, 'delete'::text, 'access'::text]))) not valid;

alter table "public"."ai_upload_audit" validate constraint "ai_upload_audit_action_check";

alter table "public"."ai_upload_audit" add constraint "ai_upload_audit_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE SET NULL not valid;

alter table "public"."ai_upload_audit" validate constraint "ai_upload_audit_document_id_fkey";

alter table "public"."api_usage_log" add constraint "api_usage_log_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE SET NULL not valid;

alter table "public"."api_usage_log" validate constraint "api_usage_log_data_source_id_fkey";

alter table "public"."approved_chunks_cache" add constraint "approved_chunks_cache_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE not valid;

alter table "public"."approved_chunks_cache" validate constraint "approved_chunks_cache_document_id_fkey";

alter table "public"."assessment_scores" add constraint "assessment_scores_assessment_id_criteria_id_key" UNIQUE using index "assessment_scores_assessment_id_criteria_id_key";

alter table "public"."assessment_scores" add constraint "assessment_scores_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE not valid;

alter table "public"."assessment_scores" validate constraint "assessment_scores_assessment_id_fkey";

alter table "public"."assessment_scores" add constraint "assessment_scores_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE not valid;

alter table "public"."assessment_scores" validate constraint "assessment_scores_criteria_id_fkey";

alter table "public"."assessments" add constraint "assessments_ai_confidence_score_check" CHECK (((ai_confidence_score >= (0)::numeric) AND (ai_confidence_score <= (100)::numeric))) not valid;

alter table "public"."assessments" validate constraint "assessments_ai_confidence_score_check";

alter table "public"."assessments" add constraint "assessments_user_acceptance_status_check" CHECK ((user_acceptance_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]))) not valid;

alter table "public"."assessments" validate constraint "assessments_user_acceptance_status_check";

alter table "public"."auditor_assignments" add constraint "auditor_assignments_assessment_id_auditor_id_key" UNIQUE using index "auditor_assignments_assessment_id_auditor_id_key";

alter table "public"."auditor_assignments" add constraint "auditor_assignments_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE not valid;

alter table "public"."auditor_assignments" validate constraint "auditor_assignments_assessment_id_fkey";

alter table "public"."backoffice_admins" add constraint "backoffice_admins_user_id_key" UNIQUE using index "backoffice_admins_user_id_key";

alter table "public"."criteria" add constraint "criteria_mps_id_fkey" FOREIGN KEY (mps_id) REFERENCES maturity_practice_statements(id) ON DELETE CASCADE not valid;

alter table "public"."criteria" validate constraint "criteria_mps_id_fkey";

alter table "public"."criteria" add constraint "criteria_organization_id_criteria_number_key" UNIQUE using index "criteria_organization_id_criteria_number_key";

alter table "public"."criteria_deferrals" add constraint "criteria_deferrals_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."criteria_deferrals" validate constraint "criteria_deferrals_organization_id_fkey";

alter table "public"."criteria_deferrals" add constraint "criteria_deferrals_original_mps_id_fkey" FOREIGN KEY (original_mps_id) REFERENCES maturity_practice_statements(id) not valid;

alter table "public"."criteria_deferrals" validate constraint "criteria_deferrals_original_mps_id_fkey";

alter table "public"."criteria_deferrals" add constraint "criteria_deferrals_proposed_criteria_id_fkey" FOREIGN KEY (proposed_criteria_id) REFERENCES criteria(id) ON DELETE CASCADE not valid;

alter table "public"."criteria_deferrals" validate constraint "criteria_deferrals_proposed_criteria_id_fkey";

alter table "public"."criteria_edit_history" add constraint "criteria_edit_history_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE not valid;

alter table "public"."criteria_edit_history" validate constraint "criteria_edit_history_criteria_id_fkey";

alter table "public"."criteria_edit_history" add constraint "criteria_edit_history_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."criteria_edit_history" validate constraint "criteria_edit_history_organization_id_fkey";

alter table "public"."criteria_rejections" add constraint "criteria_rejections_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE not valid;

alter table "public"."criteria_rejections" validate constraint "criteria_rejections_criteria_id_fkey";

alter table "public"."criteria_rejections" add constraint "criteria_rejections_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."criteria_rejections" validate constraint "criteria_rejections_organization_id_fkey";

alter table "public"."data_source_sync_logs" add constraint "data_source_sync_logs_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE CASCADE not valid;

alter table "public"."data_source_sync_logs" validate constraint "data_source_sync_logs_data_source_id_fkey";

alter table "public"."data_source_sync_logs" add constraint "data_source_sync_logs_sync_status_check" CHECK ((sync_status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text, 'partial'::text]))) not valid;

alter table "public"."data_source_sync_logs" validate constraint "data_source_sync_logs_sync_status_check";

alter table "public"."data_sources" add constraint "data_sources_organization_id_source_name_key" UNIQUE using index "data_sources_organization_id_source_name_key";

alter table "public"."data_sources" add constraint "data_sources_source_type_check" CHECK ((source_type = ANY (ARRAY['supabase'::text, 'postgresql'::text, 'mysql'::text, 'rest_api'::text, 'google_drive'::text, 'sharepoint'::text, 'api'::text, 'custom'::text]))) not valid;

alter table "public"."data_sources" validate constraint "data_sources_source_type_check";

alter table "public"."data_sources" add constraint "data_sources_sync_status_check" CHECK ((sync_status = ANY (ARRAY['never_synced'::text, 'syncing'::text, 'success'::text, 'failed'::text, 'partial'::text]))) not valid;

alter table "public"."data_sources" validate constraint "data_sources_sync_status_check";

alter table "public"."data_sources" add constraint "fk_data_sources_organization_id" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."data_sources" validate constraint "fk_data_sources_organization_id";

alter table "public"."discount_codes" add constraint "discount_codes_code_key" UNIQUE using index "discount_codes_code_key";

alter table "public"."discount_codes" add constraint "discount_codes_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'active'::text, 'expired'::text, 'revoked'::text]))) not valid;

alter table "public"."discount_codes" validate constraint "discount_codes_status_check";

alter table "public"."discount_codes" add constraint "discount_codes_type_check" CHECK ((type = ANY (ARRAY['percentage'::text, 'fixed'::text]))) not valid;

alter table "public"."discount_codes" validate constraint "discount_codes_type_check";

alter table "public"."domains" add constraint "domains_org_code_key" UNIQUE using index "domains_org_code_key";

alter table "public"."evidence" add constraint "evidence_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE not valid;

alter table "public"."evidence" validate constraint "evidence_assessment_id_fkey";

alter table "public"."evidence" add constraint "evidence_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE not valid;

alter table "public"."evidence" validate constraint "evidence_criteria_id_fkey";

alter table "public"."evidence_submissions" add constraint "evidence_submissions_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE SET NULL not valid;

alter table "public"."evidence_submissions" validate constraint "evidence_submissions_data_source_id_fkey";

alter table "public"."evidence_submissions" add constraint "evidence_submissions_evaluation_status_check" CHECK ((evaluation_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'rejected'::text]))) not valid;

alter table "public"."evidence_submissions" validate constraint "evidence_submissions_evaluation_status_check";

alter table "public"."evidence_submissions" add constraint "evidence_submissions_evidence_type_check" CHECK ((evidence_type = ANY (ARRAY['document'::text, 'image'::text, 'video'::text, 'audio'::text, 'link'::text, 'api_data'::text, 'structured_data'::text, 'other'::text]))) not valid;

alter table "public"."evidence_submissions" validate constraint "evidence_submissions_evidence_type_check";

alter table "public"."evidence_submissions" add constraint "evidence_submissions_submission_method_check" CHECK ((submission_method = ANY (ARRAY['manual'::text, 'api'::text, 'sync'::text, 'automated'::text]))) not valid;

alter table "public"."evidence_submissions" validate constraint "evidence_submissions_submission_method_check";

alter table "public"."feedback_retraining_weights" add constraint "feedback_retraining_weights_organization_id_feedback_type_f_key" UNIQUE using index "feedback_retraining_weights_organization_id_feedback_type_f_key";

alter table "public"."gap_tickets" add constraint "gap_tickets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."gap_tickets" validate constraint "gap_tickets_created_by_fkey";

alter table "public"."gap_tickets" add constraint "gap_tickets_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."gap_tickets" validate constraint "gap_tickets_organization_id_fkey";

alter table "public"."gap_tickets" add constraint "gap_tickets_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."gap_tickets" validate constraint "gap_tickets_status_check";

alter table "public"."gap_tickets" add constraint "gap_tickets_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."gap_tickets" validate constraint "gap_tickets_updated_by_fkey";

alter table "public"."human_approval_workflows" add constraint "human_approval_workflows_entity_type_check" CHECK ((entity_type = ANY (ARRAY['criteria'::text, 'evidence'::text, 'intent'::text, 'mps'::text]))) not valid;

alter table "public"."human_approval_workflows" validate constraint "human_approval_workflows_entity_type_check";

alter table "public"."human_approval_workflows" add constraint "human_approval_workflows_primary_review_decision_check" CHECK ((primary_review_decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'escalated'::text]))) not valid;

alter table "public"."human_approval_workflows" validate constraint "human_approval_workflows_primary_review_decision_check";

alter table "public"."human_approval_workflows" add constraint "human_approval_workflows_secondary_review_decision_check" CHECK ((secondary_review_decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'escalated'::text]))) not valid;

alter table "public"."human_approval_workflows" validate constraint "human_approval_workflows_secondary_review_decision_check";

alter table "public"."human_approval_workflows" add constraint "human_approval_workflows_workflow_status_check" CHECK ((workflow_status = ANY (ARRAY['pending_primary_review'::text, 'pending_secondary_review'::text, 'approved'::text, 'rejected'::text, 'escalated'::text, 'superuser_override'::text]))) not valid;

alter table "public"."human_approval_workflows" validate constraint "human_approval_workflows_workflow_status_check";

alter table "public"."learning_feedback_log" add constraint "learning_feedback_log_data_source_id_fkey" FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE SET NULL not valid;

alter table "public"."learning_feedback_log" validate constraint "learning_feedback_log_data_source_id_fkey";

alter table "public"."learning_feedback_log" add constraint "learning_feedback_log_evidence_submission_id_fkey" FOREIGN KEY (evidence_submission_id) REFERENCES evidence_submissions(id) ON DELETE CASCADE not valid;

alter table "public"."learning_feedback_log" validate constraint "learning_feedback_log_evidence_submission_id_fkey";

alter table "public"."learning_feedback_log" add constraint "learning_feedback_log_feedback_type_check" CHECK ((feedback_type = ANY (ARRAY['evaluation_correction'::text, 'suggestion_improvement'::text, 'pattern_recognition'::text, 'false_positive'::text, 'false_negative'::text, 'quality_feedback'::text]))) not valid;

alter table "public"."learning_feedback_log" validate constraint "learning_feedback_log_feedback_type_check";

alter table "public"."learning_feedback_log" add constraint "learning_feedback_log_validation_status_check" CHECK ((validation_status = ANY (ARRAY['pending'::text, 'validated'::text, 'rejected'::text, 'applied'::text]))) not valid;

alter table "public"."learning_feedback_log" validate constraint "learning_feedback_log_validation_status_check";

alter table "public"."learning_model_snapshots" add constraint "fk_model_snapshots_organization" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."learning_model_snapshots" validate constraint "fk_model_snapshots_organization";

alter table "public"."learning_model_snapshots" add constraint "unique_org_snapshot_name" UNIQUE using index "unique_org_snapshot_name";

alter table "public"."learning_rule_configurations" add constraint "fk_learning_rules_organization" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."learning_rule_configurations" validate constraint "fk_learning_rules_organization";

alter table "public"."learning_rule_configurations" add constraint "unique_org_rule_name" UNIQUE using index "unique_org_rule_name";

alter table "public"."maturity_levels" add constraint "maturity_levels_criteria_id_fkey" FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE not valid;

alter table "public"."maturity_levels" validate constraint "maturity_levels_criteria_id_fkey";

alter table "public"."maturity_levels" add constraint "maturity_levels_criteria_id_level_key" UNIQUE using index "maturity_levels_criteria_id_level_key";

alter table "public"."maturity_practice_statements" add constraint "maturity_practice_statements_domain_id_fkey" FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE not valid;

alter table "public"."maturity_practice_statements" validate constraint "maturity_practice_statements_domain_id_fkey";

alter table "public"."maturity_practice_statements" add constraint "maturity_practice_statements_organization_id_mps_number_key" UNIQUE using index "maturity_practice_statements_organization_id_mps_number_key";

alter table "public"."migration_status" add constraint "migration_status_migration_name_key" UNIQUE using index "migration_status_migration_name_key";

alter table "public"."migration_status" add constraint "migration_status_policy_log_id_fkey" FOREIGN KEY (policy_log_id) REFERENCES policy_change_log(id) not valid;

alter table "public"."migration_status" validate constraint "migration_status_policy_log_id_fkey";

alter table "public"."milestone_status_history" add constraint "milestone_status_history_entity_type_check" CHECK ((entity_type = ANY (ARRAY['milestone'::text, 'task'::text]))) not valid;

alter table "public"."milestone_status_history" validate constraint "milestone_status_history_entity_type_check";

alter table "public"."milestone_tasks" add constraint "milestone_tasks_milestone_id_fkey" FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE not valid;

alter table "public"."milestone_tasks" validate constraint "milestone_tasks_milestone_id_fkey";

alter table "public"."milestone_test_notes" add constraint "milestone_test_notes_milestone_task_id_fkey" FOREIGN KEY (milestone_task_id) REFERENCES milestone_tasks(id) ON DELETE CASCADE not valid;

alter table "public"."milestone_test_notes" validate constraint "milestone_test_notes_milestone_task_id_fkey";

alter table "public"."org_crawl_queue" add constraint "org_crawl_queue_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_crawl_queue" validate constraint "org_crawl_queue_org_id_fkey";

alter table "public"."org_crawl_queue" add constraint "org_crawl_queue_unique" UNIQUE using index "org_crawl_queue_unique";

alter table "public"."org_domains" add constraint "org_domains_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_domains" validate constraint "org_domains_org_id_fkey";

alter table "public"."org_domains" add constraint "org_domains_unique" UNIQUE using index "org_domains_unique";

alter table "public"."org_ingest_jobs" add constraint "org_ingest_jobs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_ingest_jobs" validate constraint "org_ingest_jobs_org_id_fkey";

alter table "public"."org_page_chunks" add constraint "org_page_chunks_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_page_chunks" validate constraint "org_page_chunks_org_id_fkey";

alter table "public"."org_page_chunks" add constraint "org_page_chunks_page_id_fkey" FOREIGN KEY (page_id) REFERENCES org_pages(id) ON DELETE CASCADE not valid;

alter table "public"."org_page_chunks" validate constraint "org_page_chunks_page_id_fkey";

alter table "public"."org_page_chunks" add constraint "org_page_chunks_unique" UNIQUE using index "org_page_chunks_unique";

alter table "public"."org_pages" add constraint "org_pages_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_pages" validate constraint "org_pages_org_id_fkey";

alter table "public"."org_pages" add constraint "org_pages_unique" UNIQUE using index "org_pages_unique";

alter table "public"."org_profiles" add constraint "org_profiles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_profiles" validate constraint "org_profiles_org_id_fkey";

alter table "public"."org_profiles" add constraint "org_profiles_org_id_key" UNIQUE using index "org_profiles_org_id_key";

alter table "public"."organization_documents" add constraint "mime_whitelist_chk" CHECK (((mime_type IS NULL) OR (mime_type ~ '^(application/pdf|image/(png|jpeg|tiff|webp)|application/msword|application/vnd\.openxmlformats-officedocument\.(wordprocessingml|presentationml|spreadsheetml)\.document)$'::text))) not valid;

alter table "public"."organization_documents" validate constraint "mime_whitelist_chk";

alter table "public"."organization_documents" add constraint "organization_documents_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_documents" validate constraint "organization_documents_org_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_invitation_token_key" UNIQUE using index "organization_invitations_invitation_token_key";

alter table "public"."organization_invitations" add constraint "organization_invitations_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'assessor'::text, 'viewer'::text]))) not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_role_check";

alter table "public"."organization_invitations" add constraint "unique_pending_invitation" UNIQUE using index "unique_pending_invitation";

alter table "public"."organization_members" add constraint "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_organization_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_organization_id_user_id_key" UNIQUE using index "organization_members_organization_id_user_id_key";

alter table "public"."organization_members" add constraint "organization_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'assessor'::text, 'viewer'::text]))) not valid;

alter table "public"."organization_members" validate constraint "organization_members_role_check";

alter table "public"."organization_members" add constraint "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_user_id_fkey";

alter table "public"."organizations" add constraint "organizations_brand_header_mode_check" CHECK ((brand_header_mode = ANY (ARRAY['light'::text, 'dark'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_brand_header_mode_check";

alter table "public"."organizations" add constraint "organizations_organization_level_check" CHECK ((organization_level = ANY (ARRAY['backoffice'::text, 'parent'::text, 'subsidiary'::text, 'department'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_organization_level_check";

alter table "public"."organizations" add constraint "organizations_organization_type_check" CHECK ((organization_type = ANY (ARRAY['primary'::text, 'linked'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_organization_type_check";

alter table "public"."organizations" add constraint "organizations_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."organizations" validate constraint "organizations_owner_id_fkey";

alter table "public"."organizations" add constraint "organizations_parent_organization_id_fkey" FOREIGN KEY (parent_organization_id) REFERENCES organizations(id) not valid;

alter table "public"."organizations" validate constraint "organizations_parent_organization_id_fkey";

alter table "public"."organizations" add constraint "valid_website_url" CHECK (((primary_website_url IS NULL) OR (primary_website_url ~ '^https?://[^\s/$.?#].[^\s]*$'::text))) not valid;

alter table "public"."organizations" validate constraint "valid_website_url";

alter table "public"."pattern_recognition_history" add constraint "fk_pattern_history_organization" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."pattern_recognition_history" validate constraint "fk_pattern_history_organization";

alter table "public"."pattern_recognition_history" add constraint "fk_pattern_history_pattern" FOREIGN KEY (pattern_id) REFERENCES ai_learning_patterns(id) ON DELETE CASCADE not valid;

alter table "public"."pattern_recognition_history" validate constraint "fk_pattern_history_pattern";

alter table "public"."policy_change_log" add constraint "policy_change_log_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) not valid;

alter table "public"."policy_change_log" validate constraint "policy_change_log_organization_id_fkey";

alter table "public"."processing_pipeline_status" add constraint "processing_pipeline_status_document_id_fkey" FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE not valid;

alter table "public"."processing_pipeline_status" validate constraint "processing_pipeline_status_document_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."security_configuration" add constraint "security_configuration_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."security_configuration" validate constraint "security_configuration_created_by_fkey";

alter table "public"."security_configuration" add constraint "security_configuration_setting_name_key" UNIQUE using index "security_configuration_setting_name_key";

alter table "public"."security_configuration" add constraint "security_configuration_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."security_configuration" validate constraint "security_configuration_updated_by_fkey";

alter table "public"."security_monitoring" add constraint "security_monitoring_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) not valid;

alter table "public"."security_monitoring" validate constraint "security_monitoring_organization_id_fkey";

alter table "public"."subscription_modules" add constraint "subscription_modules_slug_key" UNIQUE using index "subscription_modules_slug_key";

alter table "public"."watchdog_alerts" add constraint "watchdog_alerts_related_incident_id_fkey" FOREIGN KEY (related_incident_id) REFERENCES watchdog_incidents(id) not valid;

alter table "public"."watchdog_alerts" validate constraint "watchdog_alerts_related_incident_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  user_email_var TEXT;
  new_member_id UUID;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email_var 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF user_email_var IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Find the invitation with organization details
  SELECT 
    oi.*,
    o.name as org_name,
    o.description as org_description
  INTO invitation_record 
  FROM public.organization_invitations oi
  JOIN public.organizations o ON oi.organization_id = o.id
  WHERE oi.invitation_token = invitation_token_param 
    AND oi.status = 'pending' 
    AND oi.expires_at > now()
    AND oi.email = user_email_var;
  
  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM public.organization_invitations 
      WHERE invitation_token = invitation_token_param 
        AND status = 'pending' 
        AND expires_at > now()
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Invitation email does not match your account');
    END IF;
    
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = invitation_record.organization_id 
      AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this organization');
  END IF;
  
  -- Create the membership
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (invitation_record.organization_id, auth.uid(), invitation_record.role)
  RETURNING id INTO new_member_id;
  
  -- Mark invitation as accepted
  UPDATE public.organization_invitations 
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'member_id', new_member_id,
    'organization_id', invitation_record.organization_id,
    'organization_name', invitation_record.org_name,
    'organization_description', invitation_record.org_description,
    'role', invitation_record.role
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_backoffice_admin(admin_email text, admin_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  primary_org_id uuid;
BEGIN
  -- Only allow if current user is admin
  IF NOT is_user_admin() THEN
    RETURN FALSE;
  END IF;
  
  -- Get the user's primary organization
  SELECT get_user_primary_organization(admin_user_id) INTO primary_org_id;
  
  -- If no primary org, get any organization the user is a member of
  IF primary_org_id IS NULL THEN
    SELECT om.organization_id INTO primary_org_id
    FROM organization_members om
    WHERE om.user_id = admin_user_id
    LIMIT 1;
  END IF;
  
  -- Insert backoffice admin
  INSERT INTO public.backoffice_admins (user_id, email, granted_by)
  VALUES (admin_user_id, admin_email, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    granted_by = auth.uid(),
    granted_at = now();
  
  -- Ensure they have owner role in their organization (if they have one)
  IF primary_org_id IS NOT NULL THEN
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (admin_user_id, primary_org_id, 'owner')
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role = 'owner';
  END IF;
  
  -- Log the action
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    COALESCE(primary_org_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'backoffice_admins',
    admin_user_id,
    'BACKOFFICE_ADMIN_ADDED',
    auth.uid(),
    'Added backoffice admin with upload permissions bypass'
  );
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_assessment_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_criteria INTEGER;
  completed_criteria INTEGER;
  completion_pct DECIMAL(5,2);
BEGIN
  -- Count total criteria for this assessment
  SELECT COUNT(*) INTO total_criteria
  FROM public.criteria c
  JOIN public.maturity_practice_statements mps ON c.mps_id = mps.id
  JOIN public.domains d ON mps.domain_id = d.id
  WHERE d.organization_id = NEW.organization_id;
  
  -- Count completed criteria (approved status)
  SELECT COUNT(*) INTO completed_criteria
  FROM public.assessment_scores
  WHERE assessment_id = NEW.assessment_id 
    AND status = 'approved_locked';
  
  -- Calculate percentage
  IF total_criteria > 0 THEN
    completion_pct := (completed_criteria::DECIMAL / total_criteria::DECIMAL) * 100;
  ELSE
    completion_pct := 0;
  END IF;
  
  -- Update assessment completion percentage
  UPDATE public.assessments 
  SET overall_completion_percentage = completion_pct,
      updated_at = now()
  WHERE id = NEW.assessment_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_assessment_progress(assessment_uuid uuid)
 RETURNS TABLE(total_criteria integer, completed_criteria integer, completion_percentage numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_criteria,
    COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::INTEGER as completed_criteria,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN ase.status = 'approved_locked' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC(5,2)
    END as completion_percentage
  FROM public.assessment_scores ase
  WHERE ase.assessment_id = assessment_uuid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_document(doc_org_id uuid, doc_context_level text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Superuser bypass - can manage any document
  IF is_superuser() THEN
    RETURN TRUE;
  END IF;
  
  -- Global documents can be managed by backoffice admins
  IF doc_context_level = 'global' AND EXISTS (
    SELECT 1 FROM backoffice_admins WHERE user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Organization-specific document access
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = doc_org_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.chat_search_contains(p_org_id uuid, p_phrase text, p_top_k integer DEFAULT 8)
 RETURNS TABLE(doc_id uuid, title text, snippet text)
 LANGUAGE sql
 STABLE
AS $function$
SELECT
  d.id        AS doc_id,
  d.title,
  LEFT(c.content, 300) AS snippet
FROM public.ai_document_chunks c
JOIN public.v_ai_docs_retrievable d ON d.id = c.document_id
WHERE d.organization_id = p_org_id
  AND c.content ILIKE '%' || p_phrase || '%'
ORDER BY d.updated_at DESC
LIMIT p_top_k;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(operation_type_param text, max_attempts integer DEFAULT 5, window_minutes integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean old rate limit records
  DELETE FROM public.security_rate_limits 
  WHERE window_start < window_start_time;
  
  -- Get current attempt count
  SELECT attempt_count INTO current_count
  FROM public.security_rate_limits
  WHERE user_id = auth.uid() 
    AND operation_type = operation_type_param
    AND window_start >= window_start_time;
  
  IF current_count IS NULL THEN
    -- First attempt in window
    INSERT INTO public.security_rate_limits (user_id, operation_type, attempt_count)
    VALUES (auth.uid(), operation_type_param, 1)
    ON CONFLICT (user_id, operation_type) 
    DO UPDATE SET 
      attempt_count = 1,
      window_start = now();
    
    RETURN true;
  ELSIF current_count >= max_attempts THEN
    -- Rate limit exceeded
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'rate_limits',
      auth.uid(),
      'RATE_LIMIT_EXCEEDED',
      auth.uid(),
      'Rate limit exceeded for operation: ' || operation_type_param
    );
    
    RETURN false;
  ELSE
    -- Increment counter
    UPDATE public.security_rate_limits 
    SET attempt_count = attempt_count + 1
    WHERE user_id = auth.uid() AND operation_type = operation_type_param;
    
    RETURN true;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(user_id_param uuid, action_type_param text, window_minutes_param integer DEFAULT 5, max_attempts_param integer DEFAULT 10)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  attempt_count integer;
BEGIN
  -- Count recent attempts within the time window
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limit_log
  WHERE user_id = user_id_param
    AND action_type = action_type_param
    AND attempted_at > (now() - (window_minutes_param || ' minutes')::interval);
  
  -- Log this attempt
  INSERT INTO rate_limit_log (user_id, action_type, attempted_at)
  VALUES (user_id_param, action_type_param, now());
  
  -- Return true if under the limit, false if over
  RETURN attempt_count < max_attempts_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(user_identifier text, operation_type text, max_requests integer DEFAULT 10, time_window_seconds integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  request_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (time_window_seconds || ' seconds')::interval;
  
  -- Count recent requests
  SELECT COUNT(*) INTO request_count
  FROM public.audit_trail
  WHERE changed_by = auth.uid()
    AND action = operation_type
    AND changed_at > window_start;
  
  -- If limit exceeded, log and return false
  IF request_count >= max_requests THEN
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'rate_limiting',
      auth.uid(),
      'RATE_LIMIT_EXCEEDED',
      auth.uid(),
      'Rate limit exceeded for operation: ' || operation_type || ' (' || request_count || '/' || max_requests || ')'
    );
    
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.chunk_quality_score(p_text text)
 RETURNS real
 LANGUAGE sql
 IMMUTABLE
AS $function$
  WITH t AS (
    SELECT
      COALESCE(length(p_text), 0) AS total_len,
      length(
        regexp_replace(
          p_text,
          E'[^A-Za-z0-9\\s\\.,;:\\\'\"()/%-]+',  -- remove chars NOT in this set
          '',
          'g'
        )
      ) AS kept_len,
      length(regexp_replace(p_text, '[^0-9]', '', 'g')) AS digits_len
  )
  SELECT CASE
           WHEN total_len = 0 THEN 0
           ELSE kept_len::real / NULLIF(total_len, 0)
         END
  FROM t;
$function$
;

CREATE OR REPLACE FUNCTION public.coerce_ai_docs_tags_to_array()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_text text;
BEGIN
  -- If NULL, leave it
  IF NEW.tags IS NULL THEN
    RETURN NEW;
  END IF;

  -- If tags is already an array, trim empties and return
  BEGIN
    NEW.tags := (
      SELECT NULLIF(ARRAY(
        SELECT DISTINCT NULLIF(trim(x), '')
        FROM unnest(NEW.tags) AS x
      ), ARRAY[]::text[])
    );
    RETURN NEW;
  EXCEPTION WHEN array_subscript_error OR datatype_mismatch THEN
    -- fall through if NEW.tags isn't an array type
  END;

  -- Otherwise, treat it as TEXT and coerce
  v_text := NEW.tags::text;

  NEW.tags := NULLIF(
    ARRAY(
      SELECT DISTINCT NULLIF(trim(x), '')
      FROM unnest(
        CASE
          WHEN v_text IS NULL OR v_text = '' THEN ARRAY[]::text[]
          WHEN v_text ~ '^\{.*\}$'             THEN v_text::text[]                      -- postgres array literal
          WHEN v_text ~ '^\[.*\]$'             THEN regexp_split_to_array(              -- json-like list
                                            replace(trim(both '[]' from v_text), '"',''),
                                            '\s*,\s*')
          ELSE                                       regexp_split_to_array(v_text, '\s*[;,]\s*')
        END
      ) AS x
    ),
    ARRAY[]::text[]
  );

  RETURN NEW;
END
$function$
;

CREATE OR REPLACE FUNCTION public.count_chunks_by_organization(org_id_param uuid)
 RETURNS TABLE(total_chunks bigint, chunks_with_embeddings bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE ad.organization_id = org_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_document_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  max_version INTEGER;
BEGIN
  -- Only create version if this is an update (not insert)
  IF TG_OP = 'UPDATE' THEN
    -- Get the current max version for this document
    SELECT COALESCE(MAX(version_number), 0) INTO max_version
    FROM public.ai_document_versions 
    WHERE document_id = OLD.id;
    
    -- Create new version record with previous data
    INSERT INTO public.ai_document_versions (
      document_id,
      version_number,
      title,
      domain,
      tags,
      upload_notes,
      document_type,
      metadata,
      file_path,
      file_name,
      file_size,
      mime_type,
      created_by,
      organization_id,
      change_reason
    ) VALUES (
      OLD.id,
      max_version + 1,
      OLD.title,
      OLD.domain,
      OLD.tags,
      OLD.upload_notes,
      OLD.document_type,
      OLD.metadata,
      OLD.file_path,
      OLD.file_name,
      OLD.file_size,
      OLD.mime_type,
      NEW.updated_by,
      OLD.organization_id,
      COALESCE(NEW.metadata->>'change_reason', 'Document updated')
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.default_org_profile_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (NEW.file_name ILIKE 'Organization_Profile_%'
      OR NEW.title ILIKE 'Organization_Profile_%'
      OR NEW.file_name ILIKE '%Company_Overview%'
      OR NEW.title ILIKE '%Company_Overview%') THEN

    NEW.doc_type := COALESCE(NEW.doc_type, 'organization_profile');
    NEW.layer    := COALESCE(NEW.layer, 1);
    NEW.domain   := COALESCE(NEW.domain, 'Leadership & Governance');

    IF NEW.tags IS NULL OR array_length(NEW.tags,1) IS NULL THEN
      NEW.tags := ARRAY['organization-profile','leadership-and-governance','company-overview'];
    END IF;
  END IF;

  RETURN NEW;
END$function$
;

CREATE OR REPLACE FUNCTION public.enforce_org_doc_path()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.source_object_path !~ '^org/[0-9a-fA-F-]+/inbox/' then
    raise exception 'Invalid document path: %', new.source_object_path;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.enhanced_input_validation(input_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  validation_result jsonb;
  security_score numeric := 1.0;
  risk_factors text[] := ARRAY[]::text[];
BEGIN
  -- Initialize validation result
  validation_result := jsonb_build_object(
    'is_valid', true,
    'security_score', security_score,
    'risk_factors', risk_factors,
    'sanitized_input', input_data
  );
  
  -- Basic SQL injection detection
  IF input_data::text ~* '(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\s' THEN
    risk_factors := array_append(risk_factors, 'sql_injection_keywords');
    security_score := security_score * 0.1;
  END IF;
  
  -- XSS detection
  IF input_data::text ~* '(<script|javascript:|on\w+\s*=|eval\s*\(|expression\s*\()' THEN
    risk_factors := array_append(risk_factors, 'xss_patterns');
    security_score := security_score * 0.2;
  END IF;
  
  -- Check for suspicious patterns
  IF input_data::text ~* '(union\s+select|or\s+1\s*=\s*1|and\s+1\s*=\s*1)' THEN
    risk_factors := array_append(risk_factors, 'sql_union_injection');
    security_score := security_score * 0.1;
  END IF;
  
  -- Update result
  validation_result := jsonb_build_object(
    'is_valid', security_score > 0.5,
    'security_score', security_score,
    'risk_factors', risk_factors,
    'sanitized_input', input_data
  );
  
  -- Log security violations
  IF security_score < 0.5 THEN
    INSERT INTO audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'security_validation',
      auth.uid(),
      'SECURITY_VIOLATION_DETECTED',
      auth.uid(),
      'Enhanced validation failed: ' || array_to_string(risk_factors, ', ')
    );
  END IF;
  
  RETURN validation_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enhanced_input_validation(input_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  security_patterns text[] := ARRAY[
    -- SQL injection patterns
    'DROP\s+TABLE',
    'DELETE\s+FROM',
    'TRUNCATE\s+TABLE',
    'ALTER\s+TABLE',
    'CREATE\s+TABLE',
    'INSERT\s+INTO.*admin_users',
    'UPDATE.*admin_users',
    'GRANT\s+',
    'REVOKE\s+',
    -- XSS patterns
    '<script[^>]*>',
    'javascript:',
    'on\w+\s*=',
    'eval\s*\(',
    'expression\s*\(',
    'document\.cookie',
    'window\.location',
    -- Additional security patterns
    'union\s+select',
    'sleep\s*\(',
    'waitfor\s+delay',
    'benchmark\s*\(',
    'pg_sleep\s*\('
  ];
  pattern text;
  violations text[] := '{}';
BEGIN
  -- Check for malicious patterns
  FOREACH pattern IN ARRAY security_patterns
  LOOP
    IF input_text ~* pattern THEN
      violations := array_append(violations, pattern);
    END IF;
  END LOOP;
  
  -- If violations found, log and return invalid
  IF array_length(violations, 1) > 0 THEN
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'security_validation',
      auth.uid(),
      'SECURITY_VIOLATION_DETECTED',
      auth.uid(),
      'Malicious patterns detected: ' || array_to_string(violations, ', ')
    );
    
    RETURN jsonb_build_object(
      'valid', false,
      'errors', violations,
      'sanitized', '',
      'message', 'Input contains potentially malicious content'
    );
  END IF;
  
  -- Basic sanitization
  RETURN jsonb_build_object(
    'valid', true,
    'errors', '{}',
    'sanitized', trim(input_text),
    'message', 'Input validation passed'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_approval_requests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark expired approval requests as expired and log the action
  UPDATE approval_requests 
  SET 
    decision = 'expired',
    decided_at = now(),
    updated_at = now()
  WHERE decision = 'pending' 
    AND expires_at < now();
    
  -- Log the expiration action
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  )
  SELECT 
    organization_id,
    'approval_requests',
    id,
    'auto_expired',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Approval request expired automatically'
  FROM approval_requests 
  WHERE decision = 'expired' 
    AND decided_at >= now() - interval '1 minute';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fill_tokens_estimate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.tokens IS NULL AND NEW.content IS NOT NULL THEN
    NEW.tokens := CEIL(LENGTH(NEW.content)::numeric / 4.0)::int;
  END IF;
  RETURN NEW;
END$function$
;

CREATE OR REPLACE FUNCTION public.generate_criteria_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  mps_num INTEGER;
  next_criteria_num INTEGER;
BEGIN
  -- Get the MPS number
  SELECT mps_number INTO mps_num 
  FROM public.maturity_practice_statements 
  WHERE id = NEW.mps_id;
  
  -- Get the next criteria number for this MPS
  SELECT COALESCE(MAX(CAST(SPLIT_PART(criteria_number, '.', 2) AS INTEGER)), 0) + 1
  INTO next_criteria_num
  FROM public.criteria c
  JOIN public.maturity_practice_statements mps ON c.mps_id = mps.id
  WHERE mps.id = NEW.mps_id;
  
  -- Set the criteria number
  NEW.criteria_number := mps_num || '.' || next_criteria_num;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_completed_documents()
 RETURNS TABLE(id uuid, organization_id uuid, file_name text, title text, doc_type text, domain text, tags text[], total_chunks integer, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has access to view documents
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Must be a member of an organization to view documents';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.organization_id,
    d.file_name,
    COALESCE(d.title, regexp_replace(d.file_name, '\.[^.]+$', '', 'g')) AS title,
    d.document_type AS doc_type,
    d.domain,
    d.tags,
    d.total_chunks,
    d.updated_at
  FROM ai_documents d
  JOIN organization_members om ON d.organization_id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND d.processing_status = 'completed'
    AND d.total_chunks > 0;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_demo_documents()
 RETURNS TABLE(id uuid, file_name text, title text, document_type text, domain text, tags text[], total_chunks integer, created_at timestamp with time zone, processing_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow if user has appropriate permissions
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access demo documents';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.file_name,
    COALESCE(d.title, regexp_replace(d.file_name, '\.[^.]+$', '', 'g')) as title,
    d.document_type,
    d.domain,
    d.tags,
    d.total_chunks,
    d.created_at,
    d.processing_status
  FROM ai_documents d
  WHERE (d.metadata->>'demo_accessible')::boolean = true
    AND d.processing_status = 'completed'
    AND d.total_chunks > 0;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_filtered_document_chunks(exclude_boilerplate boolean DEFAULT true)
 RETURNS TABLE(id uuid, document_id uuid, organization_id uuid, chunk_index integer, content text, content_hash text, embedding vector, metadata jsonb, created_at timestamp with time zone, tokens integer, page integer, section text, equipment_slugs text[], stage text, layer smallint, tags text[], status text, visibility text, uploaded_by uuid, uploaded_at timestamp with time zone, updated_at timestamp with time zone, checksum text, quality_score real, is_clean boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user has access to view chunks
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Must be a member of an organization to view document chunks';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.document_id,
    c.organization_id,
    c.chunk_index,
    c.content,
    c.content_hash,
    c.embedding,
    c.metadata,
    c.created_at,
    c.tokens,
    c.page,
    c.section,
    c.equipment_slugs,
    c.stage,
    c.layer,
    c.tags,
    c.status,
    c.visibility,
    c.uploaded_by,
    c.uploaded_at,
    c.updated_at,
    c.checksum,
    c.quality_score,
    c.is_clean
  FROM ai_document_chunks c
  JOIN organization_members om ON c.organization_id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND (NOT exclude_boilerplate OR COALESCE((c.metadata->>'boilerplate')::text, 'false') <> 'true');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_hierarchy(org_id uuid)
 RETURNS TABLE(id uuid, name text, organization_level text, parent_organization_id uuid, depth integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH RECURSIVE org_hierarchy AS (
        -- Base case: start with the given organization
        SELECT 
            o.id,
            o.name,
            o.organization_level,
            o.parent_organization_id,
            0 as depth
        FROM organizations o
        WHERE o.id = org_id
        
        UNION ALL
        
        -- Recursive case: get children
        SELECT 
            o.id,
            o.name,
            o.organization_level,
            o.parent_organization_id,
            oh.depth + 1
        FROM organizations o
        INNER JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
        WHERE oh.depth < 5 -- Prevent infinite recursion
    )
    SELECT * FROM org_hierarchy ORDER BY depth, name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_security_setting(setting_name_param text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT setting_value INTO result
  FROM public.security_configuration
  WHERE setting_name = setting_name_param;
  
  RETURN COALESCE(result, 'null'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_organization_context(target_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(organization_id uuid, user_role text, organization_type text, can_upload boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Return organization context for the user with upload permissions
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    om.role as user_role,
    o.organization_type,
    (om.role IN ('admin', 'owner')) as can_upload
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = target_user_id
  ORDER BY 
    -- Prioritize primary organizations, then by role hierarchy
    CASE o.organization_type WHEN 'primary' THEN 1 ELSE 2 END,
    CASE om.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'assessor' THEN 3 
      ELSE 4 
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_primary_organization(user_uuid uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT o.id
  FROM public.organizations o
  LEFT JOIN public.organization_members om ON om.organization_id = o.id
  WHERE (o.owner_id = user_uuid OR om.user_id = user_uuid)
    AND o.organization_type = 'primary'
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_org_role(org_id_param uuid, allowed_roles_param text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id_param
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles_param)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_chunk_clean(p_text text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
WITH chars AS (
  SELECT
    length(p_text)                                   AS total,
    length(regexp_replace(p_text, '[A-Za-z]', '', 'g')) AS non_letters,
    length(regexp_replace(p_text, '[\x20-\x7E\n\r\t]', '', 'g')) AS non_printables
),
toks AS (
  SELECT cardinality(regexp_split_to_array(coalesce(p_text,''), '\s+')) AS tokens
)
SELECT
  CASE
    WHEN p_text IS NULL OR length(p_text) = 0 THEN FALSE
    WHEN (SELECT total FROM chars) < 40 THEN FALSE                                   -- too short to be useful
    WHEN (SELECT non_printables::float / NULLIF(total,0) FROM chars) > 0.08 THEN FALSE
    WHEN (SELECT tokens FROM toks) < 5 THEN FALSE                                   -- too few tokens
    ELSE TRUE
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id_param
      and m.user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_primary_organization(org_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = org_uuid AND organization_type = 'primary'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_superuser(user_id_param uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.backoffice_admins ba
    WHERE ba.user_id = user_id_param
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = user_id_param
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  );
$function$
;

CREATE OR REPLACE FUNCTION public.list_public_tables()
 RETURNS TABLE(table_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT table_name::text
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
$function$
;

CREATE OR REPLACE FUNCTION public.log_admin_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.admin_activity_log (
    admin_user_id,
    action_type,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_admin_security_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Only log if we have a valid auth.uid()
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.admin_activity_log (
      admin_user_id,
      action_type,
      entity_type,
      entity_id,
      details,
      ip_address
    ) VALUES (
      auth.uid(),
      TG_OP || '_SECURITY_CHECK',
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'timestamp', now(),
        'user_id', auth.uid(),
        'validation_passed', public.user_has_role(auth.uid(), 'admin')
      ),
      inet_client_addr()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_assessment_audit_trail()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert audit record for UPDATE operations on assessment-related tables
  IF TG_OP = 'UPDATE' THEN
    -- Log each changed field with specific focus on status changes
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, field_name, 
      old_value, new_value, changed_by, change_reason
    )
    SELECT 
      COALESCE(NEW.organization_id, OLD.organization_id),
      TG_TABLE_NAME,
      NEW.id,
      CASE 
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_change'
        ELSE TG_OP
      END,
      key,
      (to_jsonb(OLD)) ->> key,
      (to_jsonb(NEW)) ->> key,
      COALESCE(NEW.updated_by, auth.uid()),
      CASE 
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 
          CONCAT('Status changed from ', OLD.status, ' to ', NEW.status)
        ELSE 'Field updated'
      END
    FROM jsonb_each_text(to_jsonb(NEW)) 
    WHERE (to_jsonb(NEW)) ->> key IS DISTINCT FROM (to_jsonb(OLD)) ->> key
      AND key NOT IN ('updated_at', 'created_at');
      
    RETURN NEW;
  END IF;
  
  -- Insert audit record for INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_trail (
      organization_id, table_name, record_id, action, changed_by, change_reason
    ) VALUES (
      NEW.organization_id,
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      COALESCE(NEW.created_by, auth.uid()),
      CONCAT(TG_TABLE_NAME, ' created')
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_trail()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
begin
  -- Safely read either organization_id OR org_id if present on NEW
  v_org_id :=
    coalesce(
      nullif(to_jsonb(NEW)->>'organization_id','')::uuid,
      nullif(to_jsonb(NEW)->>'org_id','')::uuid
    );

  insert into public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  )
  values (
    v_org_id,
    TG_TABLE_NAME,
    NEW.id,
    TG_OP,
    coalesce(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid),
    'system'
  );

  return NEW;
end
$function$
;

CREATE OR REPLACE FUNCTION public.log_milestone_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.milestone_status_history (
      entity_type,
      entity_id,
      organization_id,
      old_status,
      new_status,
      change_reason,
      changed_by
    ) VALUES (
      CASE WHEN TG_TABLE_NAME = 'milestones' THEN 'milestone' ELSE 'task' END,
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      'Status updated via application',
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_policy_change(title_param text, type_param text, domain_scope_param text, summary_param text, linked_document_id_param text DEFAULT NULL::text, tags_param text[] DEFAULT '{}'::text[], logged_by_param text DEFAULT 'System'::text, organization_id_param uuid DEFAULT NULL::uuid, metadata_param jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_log_id UUID;
BEGIN
  INSERT INTO public.policy_change_log (
    title,
    type,
    domain_scope,
    linked_document_id,
    summary,
    tags,
    logged_by,
    organization_id,
    metadata
  ) VALUES (
    title_param,
    type_param,
    domain_scope_param,
    linked_document_id_param,
    summary_param,
    tags_param,
    logged_by_param,
    organization_id_param,
    metadata_param
  ) RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security_events',
    auth.uid(),
    event_type,
    auth.uid(),
    details::text
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_details jsonb DEFAULT '{}'::jsonb, severity_level text DEFAULT 'medium'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason,
    field_name,
    new_value
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security_events',
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    event_type,
    COALESCE(auth.uid(), '00000000-0000-0000-000000000000'::uuid),
    'Security event logged with severity: ' || severity_level,
    'event_details',
    event_details::text
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_details text, severity_level text DEFAULT 'MEDIUM'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason,
    field_name
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'security_monitoring',
    auth.uid(),
    event_type,
    auth.uid(),
    event_details,
    severity_level
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_metric(metric_type_param text, metric_value_param numeric, metadata_param jsonb DEFAULT '{}'::jsonb, organization_id_param uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_monitoring (
    metric_type,
    metric_value,
    metadata,
    organization_id
  ) VALUES (
    metric_type_param,
    metric_value_param,
    metadata_param,
    organization_id_param
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_upload_context_validation(session_id_param text, organization_id_param uuid, user_id_param uuid, validation_result_param boolean, error_details_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason,
    field_name,
    new_value
  ) VALUES (
    organization_id_param,
    'upload_session_log',
    user_id_param,
    CASE WHEN validation_result_param THEN 'CONTEXT_VALIDATION_SUCCESS' ELSE 'CONTEXT_VALIDATION_FAILED' END,
    user_id_param,
    COALESCE(error_details_param, 'Organization context validation for upload session'),
    'session_id',
    session_id_param
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_ai_chunks(p_org_id uuid, p_query_embedding vector, p_match_count integer DEFAULT 8, p_min_score double precision DEFAULT 0.0)
 RETURNS TABLE(id uuid, document_id uuid, content text, chunk_index integer, document_title text, doc_type text, score double precision)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    adc.id, adc.document_id, adc.content, adc.chunk_index,
    ad.title AS document_title, ad.document_type AS doc_type,
    1 - (adc.embedding <=> p_query_embedding) AS score
  FROM public.ai_document_chunks adc
  JOIN public.ai_documents ad ON ad.id = adc.document_id
  WHERE ad.organization_id = p_org_id
    AND adc.organization_id = p_org_id
    AND adc.embedding IS NOT NULL
    AND COALESCE(adc.is_clean, true) = true
    AND COALESCE(ad.processing_status,'completed') = 'completed'
  ORDER BY adc.embedding <=> p_query_embedding
  LIMIT p_match_count
$function$
;

CREATE OR REPLACE FUNCTION public.match_ai_chunks(query_embedding vector, match_count integer DEFAULT 5, match_threshold double precision DEFAULT 0.35)
 RETURNS TABLE(document_id uuid, content text, distance double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    t.document_id,
    t.content,
    (t.embedding <=> query_embedding) as distance
  from public.chunks t
  where 1 - (t.embedding <=> query_embedding) >= match_threshold
  order by t.embedding <=> query_embedding
  limit match_count;
$function$
;

CREATE OR REPLACE FUNCTION public.org_domains_sync_org_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.organization_id := NEW.org_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_self_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Prevent self-approval for admin-related requests
  IF NEW.approved_by = OLD.requested_by THEN
    RAISE EXCEPTION 'Users cannot approve their own requests. Violation logged.';
  END IF;
  
  -- Log the approval attempt in audit trail
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    field_name,
    old_value,
    new_value,
    changed_by,
    change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin_approval_requests',
    NEW.id,
    'APPROVAL_ATTEMPT',
    'status',
    OLD.status,
    NEW.status,
    NEW.approved_by,
    CASE 
      WHEN NEW.approved_by = OLD.requested_by THEN 'BLOCKED: Self-approval attempt'
      ELSE 'Valid approval by different admin'
    END
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.regenerate_missing_embeddings()
 RETURNS TABLE(chunks_updated bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count bigint;
BEGIN
  -- Count chunks that need embeddings
  SELECT COUNT(*) INTO updated_count
  FROM ai_document_chunks
  WHERE embedding IS NULL
    AND content IS NOT NULL
    AND length(trim(content)) > 0;
  
  -- Log the embedding regeneration need
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) 
  SELECT DISTINCT
    ad.organization_id,
    'ai_document_chunks',
    ad.organization_id,
    'embedding_regeneration_needed',
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Found ' || updated_count || ' chunks without embeddings that need regeneration'
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE adc.embedding IS NULL
    AND adc.content IS NOT NULL
    AND length(trim(adc.content)) > 0;
  
  RETURN QUERY SELECT updated_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.regenerate_missing_embeddings_for_org(org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  missing_count integer;
  total_count integer;
  result jsonb;
BEGIN
  -- Count chunks without embeddings
  SELECT COUNT(*) INTO missing_count
  FROM ai_document_chunks 
  WHERE organization_id = org_id 
    AND embedding IS NULL
    AND content IS NOT NULL
    AND length(trim(content)) > 0;
    
  SELECT COUNT(*) INTO total_count
  FROM ai_document_chunks 
  WHERE organization_id = org_id;
  
  -- Log the need for regeneration
  INSERT INTO audit_trail (
    organization_id,
    table_name, 
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    org_id,
    'ai_document_chunks',
    org_id,
    'EMBEDDING_REGENERATION_REQUESTED',
    '00000000-0000-0000-0000-000000000001'::uuid,
    format('Found %s chunks without embeddings out of %s total chunks', missing_count, total_count)
  );
  
  result := jsonb_build_object(
    'organization_id', org_id,
    'total_chunks', total_count,
    'missing_embeddings', missing_count,
    'embedding_percentage', round(100.0 * (total_count - missing_count) / NULLIF(total_count, 0), 2),
    'needs_regeneration', missing_count > 0
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_admin_access(target_user_email text, justification text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  requesting_user_id uuid;
  target_user_id uuid;
  existing_admin_count integer;
  request_id uuid;
BEGIN
  requesting_user_id := auth.uid();
  
  -- Validate input
  IF NOT public.validate_input_security(target_user_email || justification) THEN
    RETURN json_build_object('success', false, 'error', 'Security validation failed');
  END IF;
  
  -- Check if requester is already an admin (only existing admins can grant access)
  IF NOT public.is_user_admin(requesting_user_id) THEN
    -- For initial setup, allow if no admins exist
    SELECT COUNT(*) INTO existing_admin_count FROM public.admin_users;
    
    IF existing_admin_count > 0 THEN
      INSERT INTO public.audit_trail (
        organization_id, table_name, record_id, action, changed_by, change_reason
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        'admin_access_requests',
        requesting_user_id,
        'UNAUTHORIZED_ADMIN_REQUEST',
        requesting_user_id,
        'Non-admin attempted to request admin access for: ' || target_user_email
      );
      
      RETURN json_build_object('success', false, 'error', 'Only existing admins can grant admin access');
    END IF;
  END IF;
  
  -- Get target user ID
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_user_email;
  
  IF target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if user is already admin
  IF public.is_user_admin(target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User is already an admin');
  END IF;
  
  -- Create admin approval request
  INSERT INTO public.admin_approval_requests (
    request_type,
    entity_type,
    entity_id,
    requested_by,
    requested_changes
  ) VALUES (
    'GRANT_ADMIN_ACCESS',
    'user',
    target_user_id,
    requesting_user_id,
    json_build_object(
      'target_email', target_user_email,
      'justification', justification
    )
  ) RETURNING id INTO request_id;
  
  -- If no existing admins, auto-approve (initial setup)
  IF existing_admin_count = 0 THEN
    UPDATE public.admin_approval_requests 
    SET status = 'approved', approved_by = requesting_user_id 
    WHERE id = request_id;
    
    -- Grant admin access
    INSERT INTO public.admin_users (user_id, email, granted_by)
    VALUES (target_user_id, target_user_email, requesting_user_id);
    
    RETURN json_build_object('success', true, 'message', 'Admin access granted (initial setup)');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Admin access request created, awaiting approval');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.requeue_failed_crawls(max_retries integer DEFAULT 3)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
declare
  v_count bigint;
begin
  update public.org_crawl_queue
  set status       = 'queued',
      retry_count  = coalesce(retry_count,0) + 1,
      last_attempt_at = now(),
      updated_at   = now(),
      error_reason = null
  where status = 'failed'
    and coalesce(retry_count,0) < max_retries;

  get diagnostics v_count = row_count;
  return v_count;
end$function$
;

CREATE OR REPLACE FUNCTION public.reset_failed_document(doc_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete any existing chunks for this document
  DELETE FROM public.ai_document_chunks WHERE document_id = doc_id;
  
  -- Reset the document status to pending
  UPDATE public.ai_documents 
  SET processing_status = 'pending',
      processed_at = NULL,
      total_chunks = 0,
      updated_at = now()
  WHERE id = doc_id;
  
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_mps_documents_for_reprocessing(target_organization_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc_count INTEGER;
  criteria_count INTEGER;
  chunk_count INTEGER;
  result json;
  executing_user_id uuid;
BEGIN
  -- Get executing user or use a system placeholder
  executing_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Count what we're about to reset
  SELECT COUNT(*) INTO doc_count
  FROM ai_documents 
  WHERE organization_id = target_organization_id 
    AND document_type = 'mps_document';
  
  SELECT COUNT(*) INTO criteria_count
  FROM criteria c
  JOIN maturity_practice_statements mps ON c.mps_id = mps.id
  WHERE mps.organization_id = target_organization_id;
  
  SELECT COUNT(*) INTO chunk_count
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON adc.document_id = ad.id
  WHERE ad.organization_id = target_organization_id 
    AND ad.document_type = 'mps_document';
  
  -- Reset AI document chunks for MPS documents
  DELETE FROM ai_document_chunks 
  WHERE document_id IN (
    SELECT id FROM ai_documents 
    WHERE organization_id = target_organization_id 
      AND document_type = 'mps_document'
  );
  
  -- Clear old criteria tied to MPS documents
  DELETE FROM criteria 
  WHERE mps_id IN (
    SELECT id FROM maturity_practice_statements 
    WHERE organization_id = target_organization_id
  );
  
  -- Clear maturity levels associated with old criteria
  DELETE FROM maturity_levels 
  WHERE organization_id = target_organization_id;
  
  -- Clear assessment scores for old criteria
  DELETE FROM assessment_scores 
  WHERE organization_id = target_organization_id;
  
  -- Reset MPS documents to pending status
  UPDATE ai_documents 
  SET 
    processing_status = 'pending',
    processed_at = NULL,
    total_chunks = 0,
    updated_at = now()
  WHERE organization_id = target_organization_id 
    AND document_type = 'mps_document';
  
  -- Reset MPS status to not_started
  UPDATE maturity_practice_statements 
  SET 
    status = 'not_started',
    updated_at = now()
  WHERE organization_id = target_organization_id;
  
  -- Reset domain status to not_started
  UPDATE domains 
  SET 
    status = 'not_started',
    updated_at = now()
  WHERE organization_id = target_organization_id;
  
  -- Create audit log entry with fallback user
  INSERT INTO audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    target_organization_id,
    'ai_documents',
    target_organization_id,
    'bulk_reset',
    executing_user_id,
    'MPS documents reset for reprocessing with new AI Interpretation Rule'
  );
  
  -- Return summary of what was reset
  result := json_build_object(
    'success', true,
    'documents_reset', doc_count,
    'criteria_cleared', criteria_count,
    'chunks_cleared', chunk_count,
    'message', 'MPS documents successfully reset for reprocessing'
  );
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_my_mps_documents()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_org_id uuid;
  result json;
BEGIN
  -- Get the user's organization ID
  SELECT organization_id INTO user_org_id
  FROM organization_members 
  WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  LIMIT 1;
  
  IF user_org_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No organization found or insufficient permissions'
    );
  END IF;
  
  -- Call the main reset function
  SELECT public.reset_mps_documents_for_reprocessing(user_org_id) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.run_system_report()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_docs_total bigint;
  v_chunks_total bigint;
  v_chunks_chars numeric;
  v_docs_without_chunks bigint;
  v_queue jsonb;
begin
  select count(*) into v_docs_total from public.ai_documents;
  select count(*), coalesce(sum(length(content))::numeric,0) into v_chunks_total, v_chunks_chars from public.ai_document_chunks;
  select count(*) into v_docs_without_chunks
  from public.ai_documents d
  left join public.ai_document_chunks c on c.document_id = d.id
  where c.id is null;

  select coalesce(jsonb_agg(jsonb_build_object('status', status, 'count', cnt)), '[]'::jsonb)
  into v_queue
  from (
    select status, count(*) as cnt
    from public.org_crawl_queue
    group by status
    order by status
  ) q;

  insert into public.system_reports(summary)
  values (jsonb_build_object(
    'ts', now(),
    'documents_total', v_docs_total,
    'chunks_total', v_chunks_total,
    'chunk_chars_total', v_chunks_chars,
    'docs_without_chunks', v_docs_without_chunks,
    'crawl_queue', v_queue,
    'notes', 'Daily Maturion health snapshot'
  ));
end
$function$
;

CREATE OR REPLACE FUNCTION public.set_organization_owner_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Always set owner_id to current authenticated user
  NEW.owner_id = auth.uid();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.unstick_fetching_jobs(max_age interval DEFAULT '00:30:00'::interval)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_count bigint;
begin
  update public.org_crawl_queue
  set status='queued', updated_at=now(), error_reason='fetching_timeout'
  where status='fetching' and updated_at < now() - max_age;
  get diagnostics v_count = row_count;
  return v_count;
end$function$
;

CREATE OR REPLACE FUNCTION public.update_ai_ingested_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-mark as AI ingested when processing completes with chunks
  IF NEW.processing_status = 'completed' AND NEW.total_chunks > 0 THEN
    NEW.is_ai_ingested = true;
  ELSIF NEW.processing_status IN ('pending', 'processing', 'failed') THEN
    NEW.is_ai_ingested = false;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_milestone_status_on_task_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  total_tasks INTEGER;
  signed_off_tasks INTEGER;
  new_status public.milestone_status;
BEGIN
  -- Count total tasks for this milestone
  SELECT COUNT(*) INTO total_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = NEW.milestone_id;
  
  -- Count signed off tasks for this milestone
  SELECT COUNT(*) INTO signed_off_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = NEW.milestone_id 
    AND status = 'signed_off';
  
  -- Determine new milestone status
  IF total_tasks = 0 THEN
    new_status := 'not_started';
  ELSIF signed_off_tasks = total_tasks THEN
    new_status := 'signed_off';
  ELSIF signed_off_tasks > 0 THEN
    new_status := 'in_progress';
  ELSE
    new_status := 'not_started';
  END IF;
  
  -- Update milestone status
  UPDATE public.milestones 
  SET status = new_status,
      updated_at = now(),
      updated_by = NEW.updated_by
  WHERE id = NEW.milestone_id;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_milestone_status_on_task_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_tasks INTEGER;
  signed_off_tasks INTEGER;
  new_status public.milestone_status;
BEGIN
  -- Count total tasks for this milestone
  SELECT COUNT(*) INTO total_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = OLD.milestone_id;
  
  -- Count signed off tasks for this milestone
  SELECT COUNT(*) INTO signed_off_tasks
  FROM public.milestone_tasks 
  WHERE milestone_id = OLD.milestone_id 
    AND status = 'signed_off';
  
  -- Determine new milestone status
  IF total_tasks = 0 THEN
    new_status := 'not_started';
  ELSIF signed_off_tasks = total_tasks THEN
    new_status := 'signed_off';
  ELSIF signed_off_tasks > 0 THEN
    new_status := 'in_progress';
  ELSE
    new_status := 'not_started';
  END IF;
  
  -- Update milestone status
  UPDATE public.milestones 
  SET status = new_status,
      updated_at = now(),
      updated_by = OLD.updated_by
  WHERE id = OLD.milestone_id;
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_can_access_organization_context(org_id uuid, user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        -- Direct membership
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = org_id AND om.user_id = user_id
    ) OR EXISTS (
        -- Parent organization access (can access subsidiaries)
        SELECT 1 FROM organization_members om
        JOIN organizations child ON child.parent_organization_id = om.organization_id
        WHERE child.id = org_id AND om.user_id = user_id AND om.role IN ('owner', 'admin')
    ) OR (
        -- Superuser access
        is_superuser(user_id)
    );
$function$
;

CREATE OR REPLACE FUNCTION public.user_can_manage_org_invitations(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    -- User is organization owner
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- User is organization admin/owner member
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.user_can_upload_to_organization(org_id uuid, user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is a backoffice admin (bypass for internal uploads)
  IF EXISTS (
    SELECT 1 FROM public.backoffice_admins 
    WHERE backoffice_admins.user_id = user_can_upload_to_organization.user_id
  ) THEN
    -- Log backoffice access for audit (function is now VOLATILE so this works)
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      org_id,
      'backoffice_upload_access',
      user_can_upload_to_organization.user_id,
      'BACKOFFICE_UPLOAD_ACCESS_GRANTED',
      user_can_upload_to_organization.user_id,
      'Backoffice admin bypass for upload permission'
    );
    
    RETURN TRUE;
  END IF;
  
  -- Standard organization member check
  RETURN EXISTS (
    SELECT 1 
    FROM public.organization_members om
    WHERE om.organization_id = org_id 
      AND om.user_id = user_can_upload_to_organization.user_id
      AND om.role IN ('admin', 'owner')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_can_view_organization(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    -- User is owner
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- User is member
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid()
  ) OR EXISTS (
    -- User has pending invitation
    SELECT 1 FROM public.organization_invitations 
    WHERE organization_id = org_id 
      AND email = (auth.jwt() ->> 'email'::text)
      AND status = 'pending'
      AND expires_at > now()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid uuid, required_role text DEFAULT 'admin'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid 
      AND role = required_role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.validate_admin_operation(operation_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_user_id uuid;
  is_valid_admin boolean;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin using the secure function
  SELECT public.user_has_role(current_user_id, 'admin') INTO is_valid_admin;
  
  -- Log the operation attempt
  INSERT INTO public.audit_trail (
    organization_id,
    table_name,
    record_id,
    action,
    changed_by,
    change_reason
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin_operations',
    current_user_id,
    operation_type,
    current_user_id,
    CASE 
      WHEN is_valid_admin THEN 'Valid admin operation'
      ELSE 'BLOCKED: Unauthorized admin operation attempt'
    END
  );
  
  RETURN is_valid_admin;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_file_upload(file_name text, file_size bigint, mime_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sanitized_name text;
  max_size_mb integer := 100; -- 100MB limit
  allowed_types text[] := ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- Add PowerPoint support for Layer-3 extraction (training slides)
    'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint'
  ];
BEGIN
  -- Check file size (convert to MB)
  IF file_size > (max_size_mb * 1024 * 1024) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'File size exceeds ' || max_size_mb || 'MB limit'
    );
  END IF;
  
  -- Check MIME type or file extension for better PowerPoint detection
  IF NOT (mime_type = ANY(allowed_types)) AND 
     NOT (file_name ~* '\.(pptm|pptx|ppt)$') THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'File type not allowed. Supported: PDF, Word, Excel, PowerPoint (.pptm/.pptx), Text, CSV, Markdown'
    );
  END IF;
  
  -- Sanitize filename: remove special characters, normalize spaces and dashes
  sanitized_name := file_name;
  
  -- Replace special characters with safe alternatives
  sanitized_name := regexp_replace(sanitized_name, '[^\w\s\.-]', '', 'g');
  -- Replace multiple spaces/underscores with single dash
  sanitized_name := regexp_replace(sanitized_name, '[\s_]+', '-', 'g');
  -- Replace multiple dashes with single dash
  sanitized_name := regexp_replace(sanitized_name, '-+', '-', 'g');
  -- Remove leading/trailing dashes
  sanitized_name := trim(sanitized_name, '-');
  
  -- Ensure filename isn't empty after sanitization
  IF LENGTH(sanitized_name) = 0 THEN
    sanitized_name := 'document-' || extract(epoch from now())::bigint;
  END IF;
  
  -- Return success with sanitized name
  RETURN jsonb_build_object(
    'valid', true,
    'sanitized_name', sanitized_name
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_input_security(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  security_patterns text[] := ARRAY[
    'DROP\s+TABLE',
    'DELETE\s+FROM',
    'TRUNCATE\s+TABLE',
    'ALTER\s+TABLE',
    'CREATE\s+TABLE',
    'INSERT\s+INTO.*admin_users',
    'UPDATE.*admin_users',
    'GRANT\s+',
    'REVOKE\s+',
    '<script[^>]*>',
    'javascript:',
    'on\w+\s*=',
    'eval\s*\(',
    'expression\s*\('
  ];
  pattern text;
BEGIN
  -- Check for malicious patterns
  FOREACH pattern IN ARRAY security_patterns
  LOOP
    IF input_text ~* pattern THEN
      -- Log security violation
      INSERT INTO public.audit_trail (
        organization_id,
        table_name,
        record_id,
        action,
        changed_by,
        change_reason
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        'security_validation',
        auth.uid(),
        'SECURITY_VIOLATION_DETECTED',
        auth.uid(),
        'Malicious pattern detected: ' || pattern
      );
      
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_organization_access(target_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_has_access boolean := false;
  user_is_backoffice boolean := false;
BEGIN
  -- Check if user is a backoffice admin (bypass for internal uploads)
  SELECT EXISTS (
    SELECT 1 FROM public.backoffice_admins 
    WHERE user_id = auth.uid()
  ) INTO user_is_backoffice;
  
  IF user_is_backoffice THEN
    user_has_access := true;
    
    -- Log backoffice access
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      target_org_id,
      'backoffice_access_validation',
      auth.uid(),
      'BACKOFFICE_ACCESS_GRANTED',
      auth.uid(),
      'Backoffice admin bypass for organization access validation'
    );
  ELSE
    -- Standard organization member check
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = target_org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'assessor')
    ) INTO user_has_access;
    
    -- Log standard access attempt
    INSERT INTO public.audit_trail (
      organization_id,
      table_name,
      record_id,
      action,
      changed_by,
      change_reason
    ) VALUES (
      target_org_id,
      'organization_access_validation',
      auth.uid(),
      CASE WHEN user_has_access THEN 'ACCESS_GRANTED' ELSE 'ACCESS_DENIED' END,
      auth.uid(),
      'Standard organization access validation for: ' || target_org_id::text
    );
  END IF;
  
  RETURN user_has_access;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  issues text[] := '{}';
  strength_score integer := 0;
BEGIN
  -- Check minimum length
  IF length(password_text) < 12 THEN
    issues := array_append(issues, 'Password must be at least 12 characters long');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for uppercase letters
  IF password_text !~ '[A-Z]' THEN
    issues := array_append(issues, 'Password must contain at least one uppercase letter');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for lowercase letters
  IF password_text !~ '[a-z]' THEN
    issues := array_append(issues, 'Password must contain at least one lowercase letter');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for numbers
  IF password_text !~ '[0-9]' THEN
    issues := array_append(issues, 'Password must contain at least one number');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for special characters
  IF password_text !~ '[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>/?]' THEN
    issues := array_append(issues, 'Password must contain at least one special character');
  ELSE
    strength_score := strength_score + 1;
  END IF;
  
  -- Check for common patterns
  IF password_text ~* '(password|123456|qwerty|admin|test|user)' THEN
    issues := array_append(issues, 'Password contains common words that should be avoided');
    strength_score := strength_score - 1;
  END IF;
  
  -- Return validation result
  RETURN jsonb_build_object(
    'valid', array_length(issues, 1) = 0,
    'issues', issues,
    'strength_score', GREATEST(0, strength_score),
    'strength_level', 
      CASE 
        WHEN strength_score >= 5 THEN 'strong'
        WHEN strength_score >= 3 THEN 'medium'
        ELSE 'weak'
      END
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_secure_input(input_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  suspicious_patterns text[] := ARRAY[
    '<script',
    'javascript:',
    'on\w+\s*=',
    'eval\s*\(',
    'document\.',
    'window\.',
    'alert\(',
    'confirm\(',
    'prompt\('
  ];
  pattern text;
BEGIN
  IF input_text IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check for suspicious patterns
  FOREACH pattern IN ARRAY suspicious_patterns
  LOOP
    IF input_text ~* pattern THEN
      -- Log security violation
      INSERT INTO public.audit_trail (
        organization_id,
        table_name,
        record_id,
        action,
        changed_by,
        change_reason
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        'security_validation',
        auth.uid(),
        'MALICIOUS_INPUT_BLOCKED',
        auth.uid(),
        'Blocked potentially malicious input, pattern: ' || pattern
      );
      
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$function$
;

create policy "Users can access their organization's learning metrics"
on "public"."adaptive_learning_metrics"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admin users can view activity log"
on "public"."admin_activity_log"
as permissive
for select
to public
using (is_user_admin());


create policy "Admin users can manage approval requests"
on "public"."admin_approval_requests"
as permissive
for all
to authenticated
using (user_has_role(auth.uid(), 'admin'::text))
with check (user_has_role(auth.uid(), 'admin'::text));


create policy "Only admin users can view admin list"
on "public"."admin_users"
as permissive
for select
to public
using (is_user_admin(auth.uid()));


create policy "Only superusers can manage admin users"
on "public"."admin_users"
as permissive
for all
to public
using (is_superuser(auth.uid()))
with check (is_superuser(auth.uid()));


create policy "Users can access their organization's AI behavior monitoring"
on "public"."ai_behavior_monitoring"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admins can access chunk hash stats"
on "public"."ai_chunk_hash_stats"
as permissive
for all
to public
using (is_superuser());


create policy "Users can access their organization's AI confidence scoring"
on "public"."ai_confidence_scoring"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admins can insert chunks for their organization"
on "public"."ai_document_chunks"
as permissive
for insert
to authenticated
with check ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Admins can update chunks in their organization"
on "public"."ai_document_chunks"
as permissive
for update
to authenticated
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
with check ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Enhanced chunk delete access"
on "public"."ai_document_chunks"
as permissive
for delete
to public
using (can_manage_document(organization_id));


create policy "Organization members can view their chunks"
on "public"."ai_document_chunks"
as permissive
for select
to authenticated
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Secure demo read for ai_document_chunks"
on "public"."ai_document_chunks"
as permissive
for select
to public
using (((document_id IN ( SELECT ai_documents.id
   FROM ai_documents
  WHERE ((((ai_documents.metadata ->> 'demo_accessible'::text))::boolean = true) AND (ai_documents.processing_status = 'completed'::text) AND (COALESCE(((ai_documents.metadata ->> 'demo_reviewed'::text))::boolean, false) = true) AND (NOT COALESCE(((ai_documents.metadata ->> 'contains_sensitive_data'::text))::boolean, false)) AND (COALESCE(((ai_documents.metadata ->> 'security_cleared'::text))::boolean, false) = true)))) AND (length(content) < 150) AND (NOT COALESCE(((metadata ->> 'contains_pii'::text))::boolean, false)) AND (COALESCE(((metadata ->> 'demo_approved'::text))::boolean, false) = true)));


create policy "Service role can manage chunks with validation"
on "public"."ai_document_chunks"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Superuser bypass for ai_document_chunks"
on "public"."ai_document_chunks"
as permissive
for all
to authenticated
using ((is_superuser() OR user_can_view_organization(organization_id)))
with check ((is_superuser() OR user_can_upload_to_organization(organization_id, auth.uid())));


create policy "Users can view chunks from their organization"
on "public"."ai_document_chunks"
as permissive
for select
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Admins can create versions"
on "public"."ai_document_versions"
as permissive
for insert
to public
with check ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Admins can update versions"
on "public"."ai_document_versions"
as permissive
for update
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
with check ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Enhanced version delete access"
on "public"."ai_document_versions"
as permissive
for delete
to public
using (can_manage_document(organization_id));


create policy "Secure demo read for ai_document_versions"
on "public"."ai_document_versions"
as permissive
for select
to anon
using ((document_id IN ( SELECT ai_documents.id
   FROM ai_documents
  WHERE ((((ai_documents.metadata ->> 'demo_accessible'::text))::boolean = true) AND (ai_documents.processing_status = 'completed'::text)))));


create policy "Service role can insert versions for triggers"
on "public"."ai_document_versions"
as permissive
for insert
to service_role
with check (true);


create policy "Superuser bypass for ai_document_versions"
on "public"."ai_document_versions"
as permissive
for all
to public
using ((is_superuser() OR user_can_view_organization(organization_id)))
with check ((is_superuser() OR user_can_upload_to_organization(organization_id, auth.uid())));


create policy "Users can view versions from their organization"
on "public"."ai_document_versions"
as permissive
for select
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Enhanced document access control"
on "public"."ai_documents"
as permissive
for all
to public
using ((is_superuser() OR user_can_view_organization(organization_id) OR user_can_access_organization_context(organization_id) OR ((context_level = 'global'::text) AND (EXISTS ( SELECT 1
   FROM backoffice_admins
  WHERE (backoffice_admins.user_id = auth.uid()))))))
with check ((is_superuser() OR user_can_upload_to_organization(organization_id, auth.uid()) OR ((context_level = 'global'::text) AND (EXISTS ( SELECT 1
   FROM backoffice_admins
  WHERE (backoffice_admins.user_id = auth.uid()))))));


create policy "Enhanced document delete access"
on "public"."ai_documents"
as permissive
for delete
to public
using (can_manage_document(organization_id, context_level));


create policy "Org admins/owners can insert documents"
on "public"."ai_documents"
as permissive
for insert
to authenticated
with check ((is_superuser() OR (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = ai_documents.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text])))))));


create policy "Org admins/owners can update documents"
on "public"."ai_documents"
as permissive
for update
to authenticated
using ((is_superuser() OR (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = ai_documents.organization_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text])))))));


create policy "Secure demo read for ai_documents"
on "public"."ai_documents"
as permissive
for select
to public
using (((((metadata ->> 'demo_accessible'::text))::boolean = true) AND (processing_status = 'completed'::text) AND (total_chunks > 0) AND (COALESCE(((metadata ->> 'demo_reviewed'::text))::boolean, false) = true) AND (NOT COALESCE(((metadata ->> 'contains_sensitive_data'::text))::boolean, false)) AND (COALESCE(((metadata ->> 'security_cleared'::text))::boolean, false) = true)));


create policy "Superusers can create global documents"
on "public"."ai_documents"
as permissive
for insert
to public
with check ((is_superuser() OR ((context_level <> 'global'::text) AND user_can_upload_to_organization(organization_id, auth.uid()))));


create policy "Users can access documents in their org hierarchy"
on "public"."ai_documents"
as permissive
for select
to public
using ((user_can_access_organization_context(organization_id) OR user_can_access_organization_context(target_organization_id)));


create policy "Users can view documents from their organization"
on "public"."ai_documents"
as permissive
for select
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Users can access their organization's feedback log"
on "public"."ai_feedback_log"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's AI feedback loop log"
on "public"."ai_feedback_loop_log"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's feedback submissions"
on "public"."ai_feedback_submissions"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's learning patterns"
on "public"."ai_learning_patterns"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admins can view audit logs"
on "public"."ai_upload_audit"
as permissive
for select
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "System can insert audit logs"
on "public"."ai_upload_audit"
as permissive
for insert
to public
with check (true);


create policy "Users can access their organization's API usage logs"
on "public"."api_usage_log"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's approval requests"
on "public"."approval_requests"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admins can delete approved chunks from their organization"
on "public"."approved_chunks_cache"
as permissive
for delete
to authenticated
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Admins can insert approved chunks for their organization"
on "public"."approved_chunks_cache"
as permissive
for insert
to authenticated
with check ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Admins can insert approved chunks"
on "public"."approved_chunks_cache"
as permissive
for insert
to public
with check ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Admins can update approved chunks in their organization"
on "public"."approved_chunks_cache"
as permissive
for update
to authenticated
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
with check ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Organization members can view their approved chunks"
on "public"."approved_chunks_cache"
as permissive
for select
to authenticated
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Service role can manage approved chunks with validation"
on "public"."approved_chunks_cache"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Users can view approved chunks from their organization"
on "public"."approved_chunks_cache"
as permissive
for select
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Users can access their organization's assessment scores"
on "public"."assessment_scores"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Superuser bypass for assessments"
on "public"."assessments"
as permissive
for all
to authenticated
using ((is_superuser() OR user_can_view_organization(organization_id)))
with check ((is_superuser() OR user_can_view_organization(organization_id)));


create policy "Users can access their organization's assessments"
on "public"."assessments"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's audit trail"
on "public"."audit_trail"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's auditor assignments"
on "public"."auditor_assignments"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admin users can manage backoffice admins"
on "public"."backoffice_admins"
as permissive
for all
to authenticated
using (is_user_admin())
with check (is_user_admin());


create policy "Organization members can access chunks"
on "public"."chunks"
as permissive
for all
to public
using ((document_id IN ( SELECT ai_documents.id
   FROM ai_documents
  WHERE (ai_documents.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


create policy "Users can insert conversation history for their organization"
on "public"."conversation_history"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = conversation_history.organization_id) AND (om.user_id = auth.uid())))));


create policy "Users can view their organization's conversation history"
on "public"."conversation_history"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.organization_id = conversation_history.organization_id) AND (om.user_id = auth.uid())))));


create policy "Superuser bypass for criteria"
on "public"."criteria"
as permissive
for all
to authenticated
using ((is_superuser() OR user_can_view_organization(organization_id)))
with check ((is_superuser() OR user_can_view_organization(organization_id)));


create policy "Users can access their organization's criteria"
on "public"."criteria"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's deferrals"
on "public"."criteria_deferrals"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's criteria edit history"
on "public"."criteria_edit_history"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's criteria rejections"
on "public"."criteria_rejections"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admins can access cross-org tracking"
on "public"."cross_org_tracking"
as permissive
for all
to public
using ((is_user_admin() OR user_can_view_organization(source_organization_id)));


create policy "Users can access their organization's sync logs"
on "public"."data_source_sync_logs"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Superusers can manage all data sources"
on "public"."data_sources"
as permissive
for all
to public
using (is_superuser());


create policy "Users can access their organization's data sources"
on "public"."data_sources"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can delete data sources from their organization"
on "public"."data_sources"
as permissive
for delete
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can insert data sources for their organization"
on "public"."data_sources"
as permissive
for insert
to public
with check ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can update data sources in their organization"
on "public"."data_sources"
as permissive
for update
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can view data sources from their organization"
on "public"."data_sources"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can access their organization's deduplication reports"
on "public"."deduplication_reports"
as permissive
for all
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Admin users can manage discount codes"
on "public"."discount_codes"
as permissive
for all
to public
using (is_user_admin());


create policy "Authenticated users can view document types"
on "public"."document_types"
as permissive
for select
to authenticated
using (true);


create policy "Only superusers can manage document types"
on "public"."document_types"
as permissive
for all
to public
using (is_superuser())
with check (is_superuser());


create policy "Superuser bypass for domains"
on "public"."domains"
as permissive
for all
to authenticated
using ((is_superuser() OR user_can_view_organization(organization_id)))
with check ((is_superuser() OR user_can_view_organization(organization_id)));


create policy "Users can access their organization's domains"
on "public"."domains"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's evidence"
on "public"."evidence"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's evidence submissions"
on "public"."evidence_submissions"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admin users can manage all external insights"
on "public"."external_insights"
as permissive
for all
to public
using (is_user_admin());


create policy "Authenticated users can view verified low-risk insights"
on "public"."external_insights"
as permissive
for select
to public
using ((((visibility_scope = 'global'::visibility_scope) AND (is_verified = true) AND (risk_level = ANY (ARRAY['Low'::risk_level, 'Medium'::risk_level]))) OR (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.organization_id = ANY (external_insights.matched_orgs)) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text])))))));


create policy "Admins can manage retraining weights"
on "public"."feedback_retraining_weights"
as permissive
for all
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Admins can manage gap tickets for their organization"
on "public"."gap_tickets"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Users can view gap tickets for their organization"
on "public"."gap_tickets"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can access their organization's approval workflows"
on "public"."human_approval_workflows"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's learning feedback"
on "public"."learning_feedback_log"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admins can manage model snapshots"
on "public"."learning_model_snapshots"
as permissive
for all
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Users can access their organization's learning rules"
on "public"."learning_rule_configurations"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's maturity levels"
on "public"."maturity_levels"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's MPS"
on "public"."maturity_practice_statements"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Admin users can view migration status"
on "public"."migration_status"
as permissive
for select
to public
using (is_user_admin());


create policy "System can manage migration status"
on "public"."migration_status"
as permissive
for all
to public
using (false)
with check (false);


create policy "Users can access their organization's status history"
on "public"."milestone_status_history"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's milestone tasks"
on "public"."milestone_tasks"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's test notes"
on "public"."milestone_test_notes"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's milestones"
on "public"."milestones"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "org_members_read_crawl_queue"
on "public"."org_crawl_queue"
as permissive
for select
to public
using (user_can_view_organization(org_id));


create policy "org_members_read_org_domains"
on "public"."org_domains"
as permissive
for select
to public
using (user_can_view_organization(org_id));


create policy "org_members_read_ingest_jobs"
on "public"."org_ingest_jobs"
as permissive
for select
to public
using (user_can_view_organization(org_id));


create policy "org_members_read_page_chunks"
on "public"."org_page_chunks"
as permissive
for select
to public
using (user_can_view_organization(org_id));


create policy "org_members_read_pages"
on "public"."org_pages"
as permissive
for select
to public
using (user_can_view_organization(org_id));


create policy "Users can manage their organization profile"
on "public"."org_profiles"
as permissive
for all
to public
using ((org_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))))
with check ((org_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "org_docs_delete_admin"
on "public"."organization_documents"
as permissive
for delete
to public
using ((org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "org_docs_insert_admin"
on "public"."organization_documents"
as permissive
for insert
to public
with check ((org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "org_docs_select_member"
on "public"."organization_documents"
as permissive
for select
to public
using ((org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "org_docs_update_admin"
on "public"."organization_documents"
as permissive
for update
to public
using ((org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
with check ((org_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Organization owners and admins can create invitations"
on "public"."organization_invitations"
as permissive
for insert
to authenticated
with check (((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = organization_invitations.organization_id) AND (organizations.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.organization_id = organization_invitations.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text])))))));


create policy "Organization owners and admins can delete invitations"
on "public"."organization_invitations"
as permissive
for delete
to authenticated
using (((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = organization_invitations.organization_id) AND (organizations.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.organization_id = organization_invitations.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text])))))));


create policy "Organization owners and admins can update invitations"
on "public"."organization_invitations"
as permissive
for update
to authenticated
using (((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = organization_invitations.organization_id) AND (organizations.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.organization_id = organization_invitations.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text])))))));


create policy "Users can view accessible organization invitations"
on "public"."organization_invitations"
as permissive
for select
to authenticated
using ((user_can_manage_org_invitations(organization_id) OR ((email = (auth.jwt() ->> 'email'::text)) AND (status = 'pending'::invitation_status) AND (expires_at > now()))));


create policy "Triggers can insert members"
on "public"."organization_members"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can view their memberships"
on "public"."organization_members"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "Authenticated can create organizations"
on "public"."organizations"
as permissive
for insert
to authenticated
with check (true);


create policy "Owners can delete their organizations"
on "public"."organizations"
as permissive
for delete
to authenticated
using ((owner_id = auth.uid()));


create policy "Owners can update their organizations"
on "public"."organizations"
as permissive
for update
to authenticated
using ((owner_id = auth.uid()))
with check ((owner_id = auth.uid()));


create policy "Superuser bypass for organizations"
on "public"."organizations"
as permissive
for all
to authenticated
using ((is_superuser() OR user_can_view_organization(id)))
with check ((is_superuser() OR user_can_view_organization(id)));


create policy "Users can view their organizations"
on "public"."organizations"
as permissive
for select
to authenticated
using ((owner_id = auth.uid()));


create policy "Users can access their organization's override approvals"
on "public"."override_approvals"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's pattern history"
on "public"."pattern_recognition_history"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Superusers and admins can insert policy logs"
on "public"."policy_change_log"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))));


create policy "Superusers and admins can view all policy logs"
on "public"."policy_change_log"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.role = ANY (ARRAY['admin'::text, 'superuser'::text]))))));


create policy "Superusers can update policy logs"
on "public"."policy_change_log"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.role = 'superuser'::text)))));


create policy "Users can access their organization's pipeline status"
on "public"."processing_pipeline_status"
as permissive
for all
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Users can create their own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own profile"
on "public"."profiles"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Admins can manage QA alerts"
on "public"."qa_alerts"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Users can view their organization's QA alerts"
on "public"."qa_alerts"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can access their organization's QA metrics"
on "public"."qa_metrics"
as permissive
for all
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Admins can manage QA rules"
on "public"."qa_rules"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));


create policy "Users can view their organization's QA rules"
on "public"."qa_rules"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "System can insert QA test logs"
on "public"."qa_test_log"
as permissive
for insert
to public
with check (true);


create policy "Users can view their organization's QA test logs"
on "public"."qa_test_log"
as permissive
for select
to public
using (user_can_view_organization(organization_id));


create policy "Admins can delete refactor logs"
on "public"."refactor_qa_log"
as permissive
for delete
to public
using (user_can_view_organization(organization_id));


create policy "Admins can update refactor logs"
on "public"."refactor_qa_log"
as permissive
for update
to public
using (user_can_view_organization(organization_id));


create policy "System can insert refactor logs"
on "public"."refactor_qa_log"
as permissive
for insert
to public
with check (true);


create policy "Users can view their organization's refactor logs"
on "public"."refactor_qa_log"
as permissive
for select
to public
using (user_can_view_organization(organization_id));


create policy "Admin users can manage security configuration"
on "public"."security_configuration"
as permissive
for all
to authenticated
using (user_has_role(auth.uid(), 'admin'::text))
with check (user_has_role(auth.uid(), 'admin'::text));


create policy "Admin users can manage security exceptions"
on "public"."security_exceptions"
as permissive
for all
to authenticated
using (user_has_role(auth.uid(), 'admin'::text))
with check (user_has_role(auth.uid(), 'admin'::text));


create policy "Admin users can insert security monitoring data"
on "public"."security_monitoring"
as permissive
for insert
to authenticated
with check (user_has_role(auth.uid(), 'admin'::text));


create policy "Users can view their organization's security monitoring"
on "public"."security_monitoring"
as permissive
for select
to authenticated
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Admins can manage rate limits"
on "public"."security_rate_limits"
as permissive
for all
to authenticated
using (user_has_role(auth.uid(), 'admin'::text))
with check (user_has_role(auth.uid(), 'admin'::text));


create policy "System can manage rate limits"
on "public"."security_rate_limits"
as permissive
for all
to public
using (true);


create policy "Users can view their own rate limits"
on "public"."security_rate_limits"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Admin users can manage subscription modules"
on "public"."subscription_modules"
as permissive
for all
to authenticated
using (is_user_admin())
with check (is_user_admin());


create policy "Admin users only can view subscription modules"
on "public"."subscription_modules"
as permissive
for select
to public
using (is_user_admin());


create policy "Users can access their organization's system drift detection"
on "public"."system_drift_detection"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Only superusers can access system reports"
on "public"."system_reports"
as permissive
for all
to public
using (is_superuser())
with check (is_superuser());


create policy "Users can access their organization's upload sessions"
on "public"."upload_session_log"
as permissive
for all
to public
using (user_can_upload_to_organization(organization_id, auth.uid()))
with check (user_can_upload_to_organization(organization_id, auth.uid()));


create policy "Users can access their organization's watchdog alerts"
on "public"."watchdog_alerts"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


create policy "Users can access their organization's watchdog incidents"
on "public"."watchdog_incidents"
as permissive
for all
to public
using (user_can_view_organization(organization_id));


CREATE TRIGGER log_approval_requests_activity AFTER INSERT OR DELETE OR UPDATE ON public.admin_approval_requests FOR EACH ROW EXECUTE FUNCTION log_admin_activity();

CREATE TRIGGER prevent_self_approval_trigger BEFORE UPDATE ON public.admin_approval_requests FOR EACH ROW WHEN (((new.status = 'approved'::text) AND (old.status = 'pending'::text))) EXECUTE FUNCTION prevent_self_approval();

CREATE TRIGGER update_approval_requests_timestamp BEFORE UPDATE ON public.admin_approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER admin_security_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION log_admin_security_event();

CREATE TRIGGER ai_confidence_scoring_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.ai_confidence_scoring FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER trg_fill_tokens_estimate BEFORE INSERT OR UPDATE ON public.ai_document_chunks FOR EACH ROW EXECUTE FUNCTION fill_tokens_estimate();

CREATE TRIGGER ai_document_versioning_trigger BEFORE UPDATE ON public.ai_documents FOR EACH ROW EXECUTE FUNCTION create_document_version();

CREATE TRIGGER auto_update_ai_ingested BEFORE UPDATE ON public.ai_documents FOR EACH ROW EXECUTE FUNCTION update_ai_ingested_status();

CREATE TRIGGER trg_ai_docs_default_org_profile BEFORE INSERT OR UPDATE ON public.ai_documents FOR EACH ROW EXECUTE FUNCTION default_org_profile_metadata();

CREATE TRIGGER trg_ai_docs_tags_coerce BEFORE INSERT OR UPDATE OF tags ON public.ai_documents FOR EACH ROW EXECUTE FUNCTION coerce_ai_docs_tags_to_array();

CREATE TRIGGER update_ai_documents_updated_at BEFORE UPDATE ON public.ai_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_ai_feedback_submissions AFTER INSERT OR DELETE OR UPDATE ON public.ai_feedback_submissions FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER log_learning_patterns_audit AFTER INSERT OR DELETE OR UPDATE ON public.ai_learning_patterns FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER assessment_scores_audit_trigger AFTER INSERT OR UPDATE ON public.assessment_scores FOR EACH ROW EXECUTE FUNCTION log_assessment_audit_trail();

CREATE TRIGGER audit_assessment_scores AFTER INSERT OR DELETE OR UPDATE ON public.assessment_scores FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER update_assessment_completion AFTER INSERT OR DELETE OR UPDATE ON public.assessment_scores FOR EACH ROW EXECUTE FUNCTION calculate_assessment_completion();

CREATE TRIGGER assessment_audit_trigger AFTER INSERT OR UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION log_assessment_audit_trail();

CREATE TRIGGER audit_assessments AFTER INSERT OR DELETE OR UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER update_conversation_history_updated_at BEFORE UPDATE ON public.conversation_history FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER audit_criteria AFTER INSERT OR DELETE OR UPDATE ON public.criteria FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER auto_number_criteria BEFORE INSERT ON public.criteria FOR EACH ROW WHEN ((new.criteria_number IS NULL)) EXECUTE FUNCTION generate_criteria_number();

CREATE TRIGGER criteria_audit_trigger AFTER INSERT OR UPDATE ON public.criteria FOR EACH ROW EXECUTE FUNCTION log_assessment_audit_trail();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER log_discount_codes_activity AFTER INSERT OR DELETE OR UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION log_admin_activity();

CREATE TRIGGER update_discount_codes_timestamp BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_domains AFTER INSERT OR DELETE OR UPDATE ON public.domains FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_evidence AFTER INSERT OR DELETE OR UPDATE ON public.evidence FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER evidence_audit_trigger AFTER INSERT OR UPDATE ON public.evidence FOR EACH ROW EXECUTE FUNCTION log_assessment_audit_trail();

CREATE TRIGGER update_evidence_submissions_updated_at BEFORE UPDATE ON public.evidence_submissions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER update_external_insights_updated_at BEFORE UPDATE ON public.external_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_feedback_retraining_weights AFTER INSERT OR DELETE OR UPDATE ON public.feedback_retraining_weights FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_gap_tickets AFTER INSERT OR DELETE OR UPDATE ON public.gap_tickets FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER update_gap_tickets_updated_at BEFORE UPDATE ON public.gap_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_human_approval_workflows AFTER INSERT OR DELETE OR UPDATE ON public.human_approval_workflows FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER update_learning_feedback_log_updated_at BEFORE UPDATE ON public.learning_feedback_log FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER log_model_snapshots_audit AFTER INSERT OR DELETE OR UPDATE ON public.learning_model_snapshots FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER log_learning_rules_audit AFTER INSERT OR DELETE OR UPDATE ON public.learning_rule_configurations FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_maturity_levels AFTER INSERT OR DELETE OR UPDATE ON public.maturity_levels FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_mps AFTER INSERT OR DELETE OR UPDATE ON public.maturity_practice_statements FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER log_milestone_task_status_changes AFTER UPDATE ON public.milestone_tasks FOR EACH ROW EXECUTE FUNCTION log_milestone_status_change();

CREATE TRIGGER trigger_update_milestone_status_on_task_change AFTER UPDATE OF status ON public.milestone_tasks FOR EACH ROW EXECUTE FUNCTION update_milestone_status_on_task_change();

CREATE TRIGGER trigger_update_milestone_status_on_task_delete AFTER DELETE ON public.milestone_tasks FOR EACH ROW EXECUTE FUNCTION update_milestone_status_on_task_delete();

CREATE TRIGGER trigger_update_milestone_status_on_task_insert AFTER INSERT ON public.milestone_tasks FOR EACH ROW EXECUTE FUNCTION update_milestone_status_on_task_change();

CREATE TRIGGER update_milestone_tasks_updated_at BEFORE UPDATE ON public.milestone_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER log_milestone_status_changes AFTER UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION log_milestone_status_change();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER log_org_crawl_queue_audit_trail AFTER INSERT OR DELETE OR UPDATE ON public.org_crawl_queue FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER trg_touch_org_crawl_queue BEFORE UPDATE ON public.org_crawl_queue FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER log_org_domains_audit_trail AFTER INSERT OR DELETE OR UPDATE ON public.org_domains FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER trg_org_domains_sync_org_id BEFORE INSERT OR UPDATE ON public.org_domains FOR EACH ROW EXECUTE FUNCTION org_domains_sync_org_id();

CREATE TRIGGER trg_touch_org_domains BEFORE UPDATE ON public.org_domains FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER log_org_ingest_jobs_audit_trail AFTER INSERT OR DELETE OR UPDATE ON public.org_ingest_jobs FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER trg_org_ingest_jobs_updated_at BEFORE UPDATE ON public.org_ingest_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_touch_org_ingest_jobs BEFORE UPDATE ON public.org_ingest_jobs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER log_org_pages_audit_trail AFTER INSERT OR DELETE OR UPDATE ON public.org_pages FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER trg_touch_org_pages BEFORE UPDATE ON public.org_pages FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER update_org_profiles_updated_at BEFORE UPDATE ON public.org_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_enforce_org_doc_path BEFORE INSERT OR UPDATE ON public.organization_documents FOR EACH ROW EXECUTE FUNCTION enforce_org_doc_path();

CREATE TRIGGER update_organization_invitations_updated_at BEFORE UPDATE ON public.organization_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER handle_new_organization_trigger AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION handle_new_organization();

CREATE TRIGGER update_policy_change_log_updated_at BEFORE UPDATE ON public.policy_change_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER qa_rules_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.qa_rules FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER log_security_configuration_audit AFTER INSERT OR DELETE OR UPDATE ON public.security_configuration FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER update_security_configuration_updated_at BEFORE UPDATE ON public.security_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER log_subscription_modules_activity AFTER INSERT OR DELETE OR UPDATE ON public.subscription_modules FOR EACH ROW EXECUTE FUNCTION log_admin_activity();

CREATE TRIGGER update_subscription_modules_timestamp BEFORE UPDATE ON public.subscription_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER watchdog_incidents_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.watchdog_incidents FOR EACH ROW EXECUTE FUNCTION log_audit_trail();


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  create policy "Admin users can delete their organization ai documents"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'ai-documents'::text) AND (auth.uid() IN ( SELECT om.user_id
   FROM organization_members om
  WHERE ((om.role = ANY (ARRAY['admin'::text, 'owner'::text])) AND ((om.organization_id)::text = (storage.foldername(objects.name))[1]))))));



  create policy "Admin users can update their organization ai documents"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'ai-documents'::text) AND (auth.uid() IN ( SELECT om.user_id
   FROM organization_members om
  WHERE ((om.role = ANY (ARRAY['admin'::text, 'owner'::text])) AND ((om.organization_id)::text = (storage.foldername(objects.name))[1]))))));



  create policy "Admin users can upload ai documents"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'ai-documents'::text) AND (auth.uid() IN ( SELECT om.user_id
   FROM organization_members om
  WHERE (om.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));



  create policy "Admin users can view their organization ai documents"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'ai-documents'::text) AND (auth.uid() IN ( SELECT om.user_id
   FROM organization_members om
  WHERE ((om.role = ANY (ARRAY['admin'::text, 'owner'::text])) AND ((om.organization_id)::text = (storage.foldername(objects.name))[1]))))));



  create policy "Admins can delete AI documents"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'ai-documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Admins can update AI documents"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'ai-documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Admins can upload AI documents"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'ai-documents'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Anyone can view organization logos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'organization-logos'::text));



  create policy "Org members can read ai_documents"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'ai_documents'::text) AND (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (objects.name ~~ (('org/'::text || (om.organization_id)::text) || '/%'::text)))))));



  create policy "Org members can read documents"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (objects.name ~~ (('org/'::text || (om.organization_id)::text) || '/%'::text)))))));



  create policy "Organization logos are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'organization-logos'::text));



  create policy "Organization logos are publicly viewable"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'organization-logos'::text));



  create policy "Organization members can delete their logos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'organization-logos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Organization members can update their logos"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'organization-logos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Organization members can upload logos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'organization-logos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Service role can access all files in ai_documents bucket"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using ((bucket_id = 'ai_documents'::text));



  create policy "Service role can access all files in documents bucket"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using ((bucket_id = 'documents'::text));



  create policy "Superusers can manage all evidence"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'evidence'::text) AND is_superuser()));



  create policy "Users can delete their own logos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'organization-logos'::text) AND (auth.uid() IS NOT NULL) AND ((split_part(name, '/'::text, 1) = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM organizations
  WHERE (((organizations.id)::text = split_part(organizations.name, '-logo.'::text, 1)) AND (organizations.owner_id = auth.uid())))))));



  create policy "Users can delete their own organization logos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'organization-logos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their own uploaded documents"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'ai-documents'::text) AND (auth.uid() IS NOT NULL) AND ((split_part(name, '/'::text, 1) = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM organizations
  WHERE (((organizations.id)::text = split_part(organizations.name, '-'::text, 1)) AND (organizations.owner_id = auth.uid())))))));



  create policy "Users can update evidence in their organization folder"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'evidence'::text) AND ((storage.foldername(name))[1] IN ( SELECT (organization_members.organization_id)::text AS organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid())))));



  create policy "Users can update their own logos"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'organization-logos'::text) AND (auth.uid() IS NOT NULL) AND ((split_part(name, '/'::text, 1) = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM organizations
  WHERE (((organizations.id)::text = split_part(organizations.name, '-logo.'::text, 1)) AND (organizations.owner_id = auth.uid())))))));



  create policy "Users can update their own organization logos"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'organization-logos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update their own uploaded documents"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'ai-documents'::text) AND (auth.uid() IS NOT NULL) AND ((split_part(name, '/'::text, 1) = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM organizations
  WHERE (((organizations.id)::text = split_part(organizations.name, '-'::text, 1)) AND (organizations.owner_id = auth.uid())))))));



  create policy "Users can upload documents to their own folder during setup"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'ai-documents'::text) AND (auth.uid() IS NOT NULL) AND ((split_part(name, '/'::text, 1) = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM organizations
  WHERE (((organizations.id)::text = split_part(organizations.name, '-'::text, 1)) AND (organizations.owner_id = auth.uid())))))));



  create policy "Users can upload evidence to their organization folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'evidence'::text) AND ((storage.foldername(name))[1] IN ( SELECT (organization_members.organization_id)::text AS organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid())))));



  create policy "Users can upload logos to their own organization folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'organization-logos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload to their own folder during setup"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'organization-logos'::text) AND (auth.uid() IS NOT NULL) AND ((split_part(name, '/'::text, 1) = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM organizations
  WHERE (((organizations.id)::text = split_part(organizations.name, '-logo.'::text, 1)) AND (organizations.owner_id = auth.uid())))))));



  create policy "Users can view evidence from their organization"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'evidence'::text) AND ((storage.foldername(name))[1] IN ( SELECT (organization_members.organization_id)::text AS organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid())))));



  create policy "Users can view their own documents"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'ai-documents'::text) AND (auth.uid() IS NOT NULL) AND ((split_part(name, '/'::text, 1) = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM organizations
  WHERE (((organizations.id)::text = split_part(organizations.name, '-'::text, 1)) AND (organizations.owner_id = auth.uid())))))));



  create policy "org_branding_delete_admin"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'org_branding'::text) AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = 'org'::text) AND (((storage.foldername(name))[3] = 'logo'::text) OR ((storage.foldername(name))[3] = 'branding'::text)) AND has_org_role(((storage.foldername(name))[2])::uuid, ARRAY['admin'::text, 'owner'::text])));



  create policy "org_branding_insert_admin"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'org_branding'::text) AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = 'org'::text) AND (((storage.foldername(name))[3] = 'logo'::text) OR ((storage.foldername(name))[3] = 'branding'::text)) AND has_org_role(((storage.foldername(name))[2])::uuid, ARRAY['admin'::text, 'owner'::text]) AND (lower(storage.extension(name)) = ANY (ARRAY['png'::text, 'webp'::text, 'jpg'::text, 'jpeg'::text, 'svg'::text]))));



  create policy "org_branding_read_member"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'org_branding'::text) AND ((storage.foldername(name))[1] = 'org'::text) AND is_org_member(((storage.foldername(name))[2])::uuid)));



  create policy "org_branding_update_admin"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'org_branding'::text) AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = 'org'::text) AND (((storage.foldername(name))[3] = 'logo'::text) OR ((storage.foldername(name))[3] = 'branding'::text)) AND has_org_role(((storage.foldername(name))[2])::uuid, ARRAY['admin'::text, 'owner'::text])))
with check (((bucket_id = 'org_branding'::text) AND ((storage.foldername(name))[1] = 'org'::text) AND (((storage.foldername(name))[3] = 'logo'::text) OR ((storage.foldername(name))[3] = 'branding'::text)) AND has_org_role(((storage.foldername(name))[2])::uuid, ARRAY['admin'::text, 'owner'::text]) AND (lower(storage.extension(name)) = ANY (ARRAY['png'::text, 'webp'::text, 'jpg'::text, 'jpeg'::text, 'svg'::text]))));



  create policy "svc can read any object"
  on "storage"."objects"
  as permissive
  for select
  to service_role
using (true);



