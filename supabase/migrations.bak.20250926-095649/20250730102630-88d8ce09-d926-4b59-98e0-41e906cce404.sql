-- Fix RLS policy for refactor_qa_log to allow system inserts
DROP POLICY IF EXISTS "Users can access their organization's refactor logs" ON public.refactor_qa_log;

-- Create separate policies for different operations
CREATE POLICY "Users can view their organization's refactor logs" 
  ON public.refactor_qa_log
  FOR SELECT
  USING (user_can_view_organization(organization_id));

CREATE POLICY "System can insert refactor logs" 
  ON public.refactor_qa_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update refactor logs" 
  ON public.refactor_qa_log
  FOR UPDATE
  USING (user_can_view_organization(organization_id));

CREATE POLICY "Admins can delete refactor logs" 
  ON public.refactor_qa_log
  FOR DELETE
  USING (user_can_view_organization(organization_id));