-- Add audit columns to organizations table (allowing NULL initially)
ALTER TABLE public.organizations 
ADD COLUMN created_by UUID,
ADD COLUMN updated_by UUID;

-- Update existing records to set created_by and updated_by to owner_id
UPDATE public.organizations 
SET created_by = owner_id, updated_by = owner_id;

-- Now make the columns NOT NULL with proper defaults
ALTER TABLE public.organizations 
ALTER COLUMN created_by SET NOT NULL,
ALTER COLUMN created_by SET DEFAULT auth.uid(),
ALTER COLUMN updated_by SET NOT NULL,
ALTER COLUMN updated_by SET DEFAULT auth.uid();