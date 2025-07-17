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