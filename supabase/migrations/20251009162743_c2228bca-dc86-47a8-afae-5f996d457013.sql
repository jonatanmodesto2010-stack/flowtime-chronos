-- Atualizar função handle_new_user_organization para reconhecer usuários criados por admin
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
  -- Não criar organização automática para super admin
  IF public.is_super_admin(NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Se foi criado por um admin, usar a organização fornecida nos metadados
  IF (NEW.raw_user_meta_data->>'created_by_admin')::boolean IS TRUE THEN
    -- Atualizar o organization_id baseado no metadata
    UPDATE public.profiles
    SET organization_id = (NEW.raw_user_meta_data->>'organization_id')::uuid
    WHERE id = NEW.id;
    
    -- Inserir role do usuário
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (
      NEW.id, 
      (NEW.raw_user_meta_data->>'organization_id')::uuid,
      (NEW.raw_user_meta_data->>'role')::app_role
    );
    
    RETURN NEW;
  END IF;

  SELECT organization_id INTO existing_org_id
  FROM public.profiles
  WHERE id = NEW.id;
  
  IF existing_org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  user_name := COALESCE(NEW.full_name, 'Usuário');
  
  INSERT INTO public.organizations (name)
  VALUES (user_name || '''s Organization')
  RETURNING id INTO new_org_id;
  
  UPDATE public.profiles
  SET organization_id = new_org_id
  WHERE id = NEW.id;
  
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');
  
  RETURN NEW;
END;
$function$;