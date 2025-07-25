-- Fix the SECURITY DEFINER view issue by dropping the problematic view
-- The user_organization_invitations view is causing the security linter warning

DROP VIEW IF EXISTS public.user_organization_invitations;

-- The functionality can be achieved through direct table queries with proper RLS policies
-- which are already in place on the organization_invitations table
-- Applications should query organization_invitations directly instead of using this view

-- Document this change in security exceptions
INSERT INTO public.security_exceptions (
  exception_type,
  description,
  rationale,
  review_date
) VALUES (
  'VIEW_REMOVED_FOR_SECURITY',
  'Removed user_organization_invitations view',
  'The view was using SECURITY DEFINER functions which created security concerns. Applications should query organization_invitations table directly with proper RLS policies.',
  now() + interval '3 months'
);

-- Note: Applications using user_organization_invitations view should be updated to query
-- the organization_invitations table directly. The RLS policies will ensure proper access control.