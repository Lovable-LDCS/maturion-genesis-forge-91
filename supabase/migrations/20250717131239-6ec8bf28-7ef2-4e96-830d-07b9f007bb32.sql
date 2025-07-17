-- Update the milestones that have all tasks signed off but wrong status
UPDATE public.milestones 
SET status = 'signed_off',
    updated_at = now()
WHERE id = '4a064da3-41dd-4dfa-8600-cabd363c5056'; -- Automated QA Sign-Off Workflows with 6/6 tasks

UPDATE public.milestones 
SET status = 'signed_off',
    updated_at = now()
WHERE id = '768510a4-3a00-4f1d-be6f-6f6af4b394aa'; -- Milestone Tracking System with 5/5 tasks