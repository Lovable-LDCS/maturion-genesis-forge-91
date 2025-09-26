-- Clear existing test milestone data to allow real seeding
DELETE FROM milestone_test_notes WHERE organization_id = '826d7e34-1f74-408f-b948-1faeabcc0691';
DELETE FROM milestone_tasks WHERE organization_id = '826d7e34-1f74-408f-b948-1faeabcc0691';
DELETE FROM milestones WHERE organization_id = '826d7e34-1f74-408f-b948-1faeabcc0691';
DELETE FROM milestone_status_history WHERE organization_id = '826d7e34-1f74-408f-b948-1faeabcc0691';