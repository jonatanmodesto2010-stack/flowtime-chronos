-- Fix get_organization_users function
CREATE OR REPLACE FUNCTION public.get_organization_users(_org_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, phone text, role app_role, user_role_id uuid, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    ur.user_id,
    au.email,
    p.full_name,
    p.phone,
    ur.role,
    ur.id as user_role_id,
    ur.created_at
  FROM public.user_roles ur
  INNER JOIN auth.users au ON au.id = ur.user_id
  INNER JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.organization_id = _org_id
  ORDER BY ur.created_at ASC;
$function$;