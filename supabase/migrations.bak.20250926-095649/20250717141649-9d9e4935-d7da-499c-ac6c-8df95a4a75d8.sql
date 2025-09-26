-- Un-sign all tasks under the Assessment Framework Phase 1A milestone
-- Use the creator's ID as the updater since we can't use auth.uid() in a direct update
UPDATE milestone_tasks 
SET status = 'not_started', 
    updated_at = now(),
    updated_by = created_by
WHERE milestone_id = '2fa0343c-b256-46c3-9886-2345dca1aa67';