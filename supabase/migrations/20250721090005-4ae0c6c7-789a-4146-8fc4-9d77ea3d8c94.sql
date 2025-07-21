-- Allow public read access to active subscription modules for pricing display
CREATE POLICY "Public can view active subscription modules" 
ON public.subscription_modules 
FOR SELECT 
USING (is_active = true);