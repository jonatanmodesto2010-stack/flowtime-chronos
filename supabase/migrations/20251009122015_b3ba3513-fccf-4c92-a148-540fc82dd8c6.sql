-- Modificar função para não criar organização se o usuário já tiver uma
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  existing_org_id UUID;
BEGIN
  -- Verificar se o usuário já tem uma organização definida
  SELECT organization_id INTO existing_org_id
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- Se já tiver organização, não criar nova (usuário foi adicionado por admin)
  IF existing_org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Obter nome do usuário
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  
  -- Criar nova organização
  INSERT INTO public.organizations (name)
  VALUES (user_name || '''s Organization')
  RETURNING id INTO new_org_id;
  
  -- Atualizar profile com organization_id
  UPDATE public.profiles
  SET organization_id = new_org_id
  WHERE id = NEW.id;
  
  -- Adicionar usuário como owner
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');
  
  RETURN NEW;
END;
$function$;