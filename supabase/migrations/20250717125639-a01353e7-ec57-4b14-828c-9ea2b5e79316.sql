-- Insert the new milestone "Automated QA Sign-Off Workflows" for each organization that has the old milestone
INSERT INTO milestones (
  organization_id,
  name,
  description,
  priority,
  phase,
  week,
  status,
  display_order,
  created_by,
  updated_by
) 
SELECT DISTINCT
  m.organization_id,
  'Automated QA Sign-Off Workflows',
  'Implement full automation of milestone QA sign-offs, including webhook payload, Zapier integration, Slack alerting, and Google Sheet tracking.',
  'high'::milestone_priority,
  'Foundation',
  4,
  'not_started'::milestone_status,
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM milestones WHERE organization_id = m.organization_id),
  m.created_by,
  m.updated_by
FROM milestones m 
WHERE m.name = 'Assessment Framework Phase 1A - Database Enhancement';