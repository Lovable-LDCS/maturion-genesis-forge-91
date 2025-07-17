-- MILESTONE & TASK CLEANUP: Remove duplicates and fix referential integrity

-- Step 1: Identify and keep the "canonical" milestones (first by creation date)
-- Step 2: Consolidate all tasks under the canonical milestones
-- Step 3: Remove duplicate milestones and orphaned tasks

-- Create temporary table to track canonical milestones
CREATE TEMP TABLE canonical_milestones AS
SELECT DISTINCT ON (name, phase, week) 
  id, name, phase, week, created_at
FROM milestones 
ORDER BY name, phase, week, created_at ASC;

-- Update milestone_tasks to point to canonical milestones
UPDATE milestone_tasks 
SET milestone_id = cm.id
FROM canonical_milestones cm, milestones m
WHERE milestone_tasks.milestone_id = m.id 
  AND m.name = cm.name 
  AND COALESCE(m.phase, '') = COALESCE(cm.phase, '')
  AND COALESCE(m.week, 0) = COALESCE(cm.week, 0)
  AND milestone_tasks.milestone_id != cm.id;

-- Update milestone_status_history to point to canonical milestones
UPDATE milestone_status_history 
SET entity_id = cm.id
FROM canonical_milestones cm, milestones m
WHERE milestone_status_history.entity_type = 'milestone'
  AND milestone_status_history.entity_id = m.id 
  AND m.name = cm.name 
  AND COALESCE(m.phase, '') = COALESCE(cm.phase, '')
  AND COALESCE(m.week, 0) = COALESCE(cm.week, 0)
  AND milestone_status_history.entity_id != cm.id;

-- Remove duplicate milestone tasks (keep the one with most recent activity)
WITH duplicate_tasks AS (
  SELECT 
    name, 
    milestone_id,
    array_agg(id ORDER BY updated_at DESC) as task_ids
  FROM milestone_tasks 
  GROUP BY name, milestone_id
  HAVING count(*) > 1
)
DELETE FROM milestone_tasks 
WHERE id IN (
  SELECT unnest(task_ids[2:]) 
  FROM duplicate_tasks
);

-- Remove duplicate milestones (keep canonical ones only)
DELETE FROM milestones 
WHERE id NOT IN (SELECT id FROM canonical_milestones);

-- Clean up any orphaned milestone_status_history records
DELETE FROM milestone_status_history 
WHERE entity_type = 'milestone' 
  AND entity_id NOT IN (SELECT id FROM milestones);

DELETE FROM milestone_status_history 
WHERE entity_type = 'task' 
  AND entity_id NOT IN (SELECT id FROM milestone_tasks);

-- Clean up any orphaned milestone_test_notes
DELETE FROM milestone_test_notes 
WHERE milestone_task_id NOT IN (SELECT id FROM milestone_tasks);

-- Display final cleanup summary
SELECT 
  'CLEANUP SUMMARY' as action,
  (SELECT count(*) FROM milestones) as total_milestones,
  (SELECT count(*) FROM milestone_tasks) as total_tasks,
  (SELECT count(*) FROM milestone_status_history) as total_history_records,
  (SELECT count(*) FROM milestone_test_notes) as total_test_notes;