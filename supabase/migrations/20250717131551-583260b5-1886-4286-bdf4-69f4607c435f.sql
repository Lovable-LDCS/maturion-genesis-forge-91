-- Fix milestone status inconsistencies based on actual task completion
UPDATE milestones 
SET status = 'in_progress', updated_at = now()
WHERE id = '2d2db14d-790b-431e-8742-6d64cf2d6180' -- Team Management: 2/5 tasks signed off

-- Fix Assessment Framework Phase 1B - should be not_started since 0/5 tasks signed off
UPDATE milestones 
SET status = 'not_started', updated_at = now()
WHERE id = '6b3cee30-13b1-4597-ab06-57d121923ffd'; -- Assessment Framework Phase 1B