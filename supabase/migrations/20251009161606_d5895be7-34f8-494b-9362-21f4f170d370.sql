-- Função para adicionar usuário à organização (bypassa RLS com segurança)
CREATE OR REPLACE FUNCTION public.add_user_to_organization(
  _user_id UUID,
  _organization_id UUID,
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário autenticado tem permissão (owner ou admin)
  IF NOT (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para adicionar usuários';
  END IF;
  
  -- Verificar se o admin está na mesma organização
  IF NOT user_in_organization(auth.uid(), _organization_id) THEN
    RAISE EXCEPTION 'Você não pertence a esta organização';
  END IF;
  
  -- Atualizar o organization_id do profile
  UPDATE public.profiles
  SET organization_id = _organization_id
  WHERE id = _user_id;
  
  -- Inserir ou atualizar a role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (_user_id, _organization_id, _role)
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET role = EXCLUDED.role;
END;
$$;