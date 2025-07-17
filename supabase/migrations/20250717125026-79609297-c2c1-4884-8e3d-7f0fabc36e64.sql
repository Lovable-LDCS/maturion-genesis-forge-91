-- Reset the incorrect sign-off status for Assessment Framework Phase 1A milestones
UPDATE milestones 
SET status = 'not_started', updated_at = now() 
WHERE name = 'Assessment Framework Phase 1A - Database Enhancement';

-- Reset all tasks for these milestones
UPDATE milestone_tasks 
SET status = 'not_started', updated_at = now() 
WHERE milestone_id IN (
  SELECT id FROM milestones 
  WHERE name = 'Assessment Framework Phase 1A - Database Enhancement'
);

-- Insert the new milestone "Automated QA Sign-Off Workflows"
INSERT INTO milestones (
  name,
  description,
  phase,
  week,
  priority,
  status,
  display_order,
  organization_id,
  created_by,
  updated_by
) 
SELECT 
  'Automated QA Sign-Off Workflows',
  'Implement full automation of milestone QA sign-offs, including webhook payload, Zapier integration, Slack alerting, and Google Sheet tracking.',
  'Foundation',
  4,
  'high',
  'not_started',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM milestones WHERE organization_id = m.organization_id),
  m.created_by,
  m.updated_by
FROM milestones m 
WHERE m.name = 'Assessment Framework Phase 1A - Database Enhancement'
LIMIT 1;

-- Insert sample tasks for the new milestone
INSERT INTO milestone_tasks (
  milestone_id,
  name,
  description,
  display_order,
  organization_id,
  created_by,
  updated_by
)
SELECT 
  nm.id,
  task_name,
  task_desc,
  task_order,
  nm.organization_id,
  nm.created_by,
  nm.updated_by
FROM (
  SELECT id, organization_id, created_by, updated_by
  FROM milestones 
  WHERE name = 'Automated QA Sign-Off Workflows'
  LIMIT 1
) nm
CROSS JOIN (
  VALUES 
    ('Implement webhook payload structure', 'Create standardized webhook payload for milestone sign-offs', 1),
    ('Configure Zapier integration endpoints', 'Set up Zapier webhook triggers and data mapping', 2),
    ('Implement Slack notification system', 'Create automated Slack alerts for sign-off events', 3),
    ('Set up Google Sheet tracking', 'Configure automated logging to Google Sheets', 4),
    ('Add visual progress tracking', 'Implement task-level progress indicators with confirmation', 5),
    ('Test end-to-end workflow', 'Validate complete automation from sign-off to external systems', 6)
) t(task_name, task_desc, task_order);