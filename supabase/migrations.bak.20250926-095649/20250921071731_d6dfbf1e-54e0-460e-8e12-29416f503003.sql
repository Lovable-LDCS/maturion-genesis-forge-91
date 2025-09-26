-- Add missing foreign key constraint for data_sources table
ALTER TABLE public.data_sources 
ADD CONSTRAINT fk_data_sources_organization_id 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Add RLS policies for data_sources table
CREATE POLICY "Users can view data sources from their organization" 
ON public.data_sources 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert data sources for their organization" 
ON public.data_sources 
FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update data sources in their organization" 
ON public.data_sources 
FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete data sources from their organization" 
ON public.data_sources 
FOR DELETE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Superusers can manage all data sources" 
ON public.data_sources 
FOR ALL 
USING (is_superuser());