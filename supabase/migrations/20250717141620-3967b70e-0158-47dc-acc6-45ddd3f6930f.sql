-- Un-sign all tasks under the Assessment Framework Phase 1A milestone
UPDATE milestone_tasks 
SET status = 'not_started', 
    updated_at = now(),
    updated_by = auth.uid()
WHERE milestone_id = '2fa0343c-b256-46c3-9886-2345dca1aa67';