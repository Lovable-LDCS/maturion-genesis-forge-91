-- Data cleanup: Remove duplicate milestones and tasks, keep only the main organization data
-- First, let's identify the primary organization to keep (the one with most activity)
-- Based on the data, org '8a2a2d7e-6c2b-4d6f-b149-0f3da38f74b9' has signed off milestones

-- Delete milestone tasks for organizations we're removing
DELETE FROM milestone_tasks 
WHERE organization_id IN (
  '826d7e34-1f74-408f-b948-1faeabcc0691',
  'fcc3e17b-6c58-452d-9e20-afa7d61b9d61'
);

-- Delete milestone test notes for organizations we're removing  
DELETE FROM milestone_test_notes
WHERE organization_id IN (
  '826d7e34-1f74-408f-b948-1faeabcc0691', 
  'fcc3e17b-6c58-452d-9e20-afa7d61b9d61'
);

-- Delete milestone status history for organizations we're removing
DELETE FROM milestone_status_history
WHERE organization_id IN (
  '826d7e34-1f74-408f-b948-1faeabcc0691',
  'fcc3e17b-6c58-452d-9e20-afa7d61b9d61'
);

-- Delete duplicate milestones, keeping only the main organization
DELETE FROM milestones 
WHERE organization_id IN (
  '826d7e34-1f74-408f-b948-1faeabcc0691',
  'fcc3e17b-6c58-452d-9e20-afa7d61b9d61'
);