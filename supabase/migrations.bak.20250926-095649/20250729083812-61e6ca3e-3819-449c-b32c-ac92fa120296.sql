-- COMPREHENSIVE DATABASE CLEANUP FOR FRESH CRITERIA TESTING
-- This migration cleans up orphaned data and resets states for clean testing

-- 1. CLEAN UP FAILED DOCUMENTS
-- Remove failed MPS document and its associated chunks
DELETE FROM ai_document_chunks 
WHERE document_id = '3f930b4a-98b4-43fa-ba42-318e90bb765b';

DELETE FROM ai_documents 
WHERE id = '3f930b4a-98b4-43fa-ba42-318e90bb765b' AND processing_status = 'failed';

-- 2. RESET CRITERIA TO CLEAN STATE
-- Reset all criteria to not_started status for fresh testing
UPDATE criteria 
SET status = 'not_started',
    statement_approved_by = NULL,
    statement_approved_at = NULL,
    updated_at = now()
WHERE status != 'not_started';

-- 3. RESET MPS STATUS FOR CONSISTENT STATE
-- Reset MPS that have criteria but no approved criteria back to appropriate status
UPDATE maturity_practice_statements mps
SET status = 'approved_locked',
    updated_at = now()
WHERE id IN (
  SELECT DISTINCT mps.id 
  FROM maturity_practice_statements mps
  JOIN criteria c ON mps.id = c.mps_id
  WHERE mps.status != 'approved_locked'
);

-- 4. RESET DOMAIN STATUS FOR CONSISTENCY
-- Reset domains to reflect clean state
UPDATE domains 
SET status = 'approved_locked',
    updated_at = now()
WHERE status != 'approved_locked';

-- 5. CLEAN UP ASSESSMENT SCORES FOR FRESH TESTING
-- Remove old assessment scores to start fresh
DELETE FROM assessment_scores 
WHERE status = 'not_started' OR status IS NULL;

-- 6. CLEAN UP MATURITY LEVELS FOR FRESH TESTING
-- Remove any incomplete maturity levels
DELETE FROM maturity_levels 
WHERE descriptor_approved_by IS NULL OR descriptor_approved_at IS NULL;

-- 7. CLEAN UP OLD ADMIN ACTIVITY LOGS (keep recent for debugging)
-- Remove admin activity logs older than 3 days to reduce clutter
DELETE FROM admin_activity_log 
WHERE created_at < NOW() - INTERVAL '3 days';

-- 8. VERIFY DOCUMENT PROCESSING CONSISTENCY
-- Ensure all completed documents have proper chunk counts
UPDATE ai_documents 
SET total_chunks = (
  SELECT COUNT(*) 
  FROM ai_document_chunks 
  WHERE document_id = ai_documents.id
)
WHERE processing_status = 'completed';

-- 9. CLEAN UP ORPHANED CRITERIA DEFERRALS
-- Remove any deferrals that reference non-existent criteria
DELETE FROM criteria_deferrals 
WHERE proposed_criteria_id NOT IN (SELECT id FROM criteria);

-- 10. CLEAN UP ORPHANED CRITERIA REJECTIONS
-- Remove any rejections that reference non-existent criteria
DELETE FROM criteria_rejections 
WHERE criteria_id NOT IN (SELECT id FROM criteria);

-- 11. CLEAN UP ORPHANED CRITERIA EDIT HISTORY
-- Remove any edit history that references non-existent criteria
DELETE FROM criteria_edit_history 
WHERE criteria_id NOT IN (SELECT id FROM criteria);