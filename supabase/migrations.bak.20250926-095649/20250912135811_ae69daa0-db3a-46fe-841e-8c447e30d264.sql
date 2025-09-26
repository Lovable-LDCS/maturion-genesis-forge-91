-- Fix security linter warnings for functions created in the previous migration

-- Update the touch_updated_at function to set search_path
create or replace function public.touch_updated_at()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end$$;