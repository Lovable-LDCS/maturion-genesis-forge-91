-- Clean up stuck invitation data for testing
DELETE FROM public.organization_invitations 
WHERE email = 'johanras26@gmail.com';

-- Drop the existing unique constraint
ALTER TABLE public.organization_invitations 
DROP CONSTRAINT IF EXISTS organization_invitations_organization_id_email_key;

-- Create a partial unique index that only applies to pending invitations
-- This allows resending invitations after canceling or expiring old ones
CREATE UNIQUE INDEX unique_pending_invitations
ON public.organization_invitations (organization_id, email)
WHERE status = 'pending';

-- Add helpful comment
COMMENT ON INDEX unique_pending_invitations IS 'Ensures only one pending invitation per email per organization, allows resending after cancellation/expiry';