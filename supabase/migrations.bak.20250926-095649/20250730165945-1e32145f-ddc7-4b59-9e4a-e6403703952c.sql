-- Enable RLS on the migration_status table to fix the security issue
ALTER TABLE public.migration_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for migration_status table
-- Only allow admins to read migration status
CREATE POLICY "Admin users can view migration status" 
ON public.migration_status 
FOR SELECT 
USING (is_user_admin());

-- Only allow system to insert/update migration records
CREATE POLICY "System can manage migration status" 
ON public.migration_status 
FOR ALL 
USING (false) 
WITH CHECK (false);