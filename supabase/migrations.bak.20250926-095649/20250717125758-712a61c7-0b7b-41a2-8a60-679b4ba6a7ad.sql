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
  task_data.task_name,
  task_data.task_desc,
  task_data.task_order,
  nm.organization_id,
  nm.created_by,
  nm.updated_by
FROM milestones nm
CROSS JOIN (
  VALUES 
    ('Implement webhook payload structure', 'Create standardized webhook payload for milestone sign-offs', 1),
    ('Configure Zapier integration endpoints', 'Set up Zapier webhook triggers and data mapping', 2),
    ('Implement Slack notification system', 'Create automated Slack alerts for sign-off events', 3),
    ('Set up Google Sheet tracking', 'Configure automated logging to Google Sheets', 4),
    ('Add visual progress tracking', 'Implement task-level progress indicators with confirmation', 5),
    ('Test end-to-end workflow', 'Validate complete automation from sign-off to external systems', 6)
) AS task_data(task_name, task_desc, task_order)
WHERE nm.name = 'Automated QA Sign-Off Workflows';