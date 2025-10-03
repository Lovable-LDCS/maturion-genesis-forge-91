-- up
-- Ensure service_role can perform administrative resets via Edge Functions
grant usage on schema public to service_role;

-- Core tables for MPS reset
grant select, insert, update, delete on table public.domains to service_role;
grant select, insert, update, delete on table public.maturity_practice_statements to service_role;
grant select, insert, update, delete on table public.criteria to service_role;
grant select, insert, update, delete on table public.criteria_deferrals to service_role;

-- Dependent tables that may reference criteria via FK
grant select, insert, update, delete on table public.ai_behavior_monitoring to service_role;
grant select, insert, update, delete on table public.ai_confidence_scoring to service_role;
grant select, insert, update, delete on table public.ai_feedback_submissions to service_role;
grant select, insert, update, delete on table public.assessment_scores to service_role;
grant select, insert, update, delete on table public.criteria_edit_history to service_role;
grant select, insert, update, delete on table public.criteria_rejections to service_role;
grant select, insert, update, delete on table public.evidence to service_role;
grant select, insert, update, delete on table public.maturity_levels to service_role;

-- down
-- Revert grants (use with caution)
revoke select, insert, update, delete on table public.maturity_levels from service_role;
revoke select, insert, update, delete on table public.evidence from service_role;
revoke select, insert, update, delete on table public.criteria_rejections from service_role;
revoke select, insert, update, delete on table public.criteria_edit_history from service_role;
revoke select, insert, update, delete on table public.assessment_scores from service_role;
revoke select, insert, update, delete on table public.ai_feedback_submissions from service_role;
revoke select, insert, update, delete on table public.ai_confidence_scoring from service_role;
revoke select, insert, update, delete on table public.ai_behavior_monitoring from service_role;
revoke select, insert, update, delete on table public.criteria_deferrals from service_role;
revoke select, insert, update, delete on table public.criteria from service_role;
revoke select, insert, update, delete on table public.maturity_practice_statements from service_role;
revoke select, insert, update, delete on table public.domains from service_role;
-- Note: not revoking schema usage to avoid breaking functions unexpectedly
