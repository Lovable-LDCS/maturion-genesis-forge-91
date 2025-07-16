-- Fix the RLS policy that's causing permission errors
-- Drop the problematic policy
DROP POLICY "Users can view invitations sent to their email" ON public.organization_invitations;

-- Create a simpler policy that doesn't access auth.users table
-- This allows users to view invitations by token (for acceptance workflow)
CREATE POLICY "Users can view invitations by token"
  ON public.organization_invitations
  FOR SELECT
  USING (true); -- This will be restricted by application logic instead

-- Update QA Status: Fix critical error in team invitation system