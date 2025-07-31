-- Temporarily disable RLS on admin_users
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Fix the logging function to handle null auth.uid()
CREATE OR REPLACE FUNCTION public.log_admin_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Only log if we have a valid auth.uid()
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.admin_activity_log (
      admin_user_id,
      action_type,
      entity_type,
      entity_id,
      details,
      ip_address
    ) VALUES (
      auth.uid(),
      TG_OP || '_SECURITY_CHECK',
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'timestamp', now(),
        'user_id', auth.uid(),
        'validation_passed', public.user_has_role(auth.uid(), 'admin')
      ),
      inet_client_addr()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Insert your admin user
INSERT INTO public.admin_users (user_id, email, role, granted_by)
VALUES ('1dfc1c68-022a-4b49-a86e-272a83bff8d3', 'johan.ras2@outlook.com', 'admin', '1dfc1c68-022a-4b49-a86e-272a83bff8d3')
ON CONFLICT (user_id) DO UPDATE SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = now();

-- Re-enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;