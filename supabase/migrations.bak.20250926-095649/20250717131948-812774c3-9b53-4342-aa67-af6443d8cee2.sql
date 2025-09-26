-- Test trigger by signing off one more task to see if milestone moves to signed_off when all are complete
-- Let's sign off all remaining tasks for Team Management to test the trigger
UPDATE milestone_tasks 
SET status = 'signed_off', updated_at = now(), updated_by = '9ef75fc4-0a45-4c90-bd26-1b5898846326'
WHERE milestone_id = '2d2db14d-790b-431e-8742-6d64cf2d6180' 
  AND status != 'signed_off';