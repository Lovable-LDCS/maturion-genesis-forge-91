-- Add unique constraint to prevent duplicate pending invitations for same email+organization

-- Create unique constraint to prevent duplicate pending invitations
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT unique_pending_invitation 
UNIQUE (organization_id, email, status) 
DEFERRABLE INITIALLY DEFERRED;

-- This allows:
-- 1. Multiple invitations to same email if different orgs
-- 2. Multiple invitations to same email+org if different statuses (e.g., expired then new pending)
-- 3. Prevents duplicate pending invitations for same email+org combination

-- Update QA Status: Added duplicate invitation prevention constraint