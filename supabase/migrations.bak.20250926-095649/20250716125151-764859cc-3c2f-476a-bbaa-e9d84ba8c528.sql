-- Clean up duplicate invitations and add uniqueness constraint

-- First, clean up duplicate records by keeping only the most recent one for each group
WITH duplicate_groups AS (
  SELECT organization_id, email, status
  FROM public.organization_invitations 
  GROUP BY organization_id, email, status 
  HAVING COUNT(*) > 1
),
records_to_keep AS (
  SELECT DISTINCT ON (oi.organization_id, oi.email, oi.status) 
    oi.id
  FROM public.organization_invitations oi
  INNER JOIN duplicate_groups dg ON (
    oi.organization_id = dg.organization_id 
    AND oi.email = dg.email 
    AND oi.status = dg.status
  )
  ORDER BY oi.organization_id, oi.email, oi.status, oi.created_at DESC
)
DELETE FROM public.organization_invitations 
WHERE id NOT IN (SELECT id FROM records_to_keep)
  AND (organization_id, email, status) IN (
    SELECT organization_id, email, status FROM duplicate_groups
  );

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE public.organization_invitations 
ADD CONSTRAINT unique_pending_invitation 
UNIQUE (organization_id, email, status);

-- Update QA Status: Cleaned duplicate invitations and added prevention constraint