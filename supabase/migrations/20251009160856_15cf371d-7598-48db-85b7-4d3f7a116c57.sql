-- Criar função para buscar usuários da organização com emails
CREATE OR REPLACE FUNCTION public.get_organization_users(_org_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role app_role,
  user_role_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;