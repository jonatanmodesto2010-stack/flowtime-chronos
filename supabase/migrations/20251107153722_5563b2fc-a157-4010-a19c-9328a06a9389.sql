-- Atualizar a função handle_new_user_complete com logs detalhados
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  user_name TEXT;
BEGIN
  RAISE NOTICE '[Trigger] handle_new_user_complete iniciado para user_id: %', NEW.id;
  RAISE NOTICE '[Trigger] Email: %', NEW.email;
  RAISE NOTICE '[Trigger] raw_user_meta_data: %', NEW.raw_user_meta_data;
  
  -- Criar profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'full_name')::text,
      'Usuário'
    )
  );
  
  RAISE NOTICE '[Trigger] ✅ Profile criado para user_id: %', NEW.id;

  -- Verificar se é super admin
  IF public.is_super_admin(NEW.id) THEN
    RAISE NOTICE '[Trigger] Usuário é super admin, pulando criação de org';
    RETURN NEW;
  END IF;

  -- Verificar se foi criado por admin
  IF (NEW.raw_user_meta_data->>'created_by_admin')::boolean IS TRUE THEN
    RAISE NOTICE '[Trigger] Usuário criado por admin, adicionando à org: %', (NEW.raw_user_meta_data->>'organization_id')::uuid;
    
    UPDATE public.profiles
    SET organization_id = (NEW.raw_user_meta_data->>'organization_id')::uuid
    WHERE id = NEW.id;
    
    RAISE NOTICE '[Trigger] ✅ Profile atualizado com organization_id';
    
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (
      NEW.id, 
      (NEW.raw_user_meta_data->>'organization_id')::uuid,
      (NEW.raw_user_meta_data->>'role')::app_role
    );
    
    RAISE NOTICE '[Trigger] ✅ User role criado com sucesso para role: %', (NEW.raw_user_meta_data->>'role')::app_role;
    
    RETURN NEW;
  END IF;

  -- Criar nova organização para usuários normais
  RAISE NOTICE '[Trigger] Criando nova organização para usuário normal';
  
  user_name := COALESCE((NEW.raw_user_meta_data->>'full_name')::text, 'Usuário');
  
  INSERT INTO public.organizations (name)
  VALUES (user_name || '''s Organization')
  RETURNING id INTO new_org_id;
  
  RAISE NOTICE '[Trigger] ✅ Organização criada: %', new_org_id;
  
  UPDATE public.profiles
  SET organization_id = new_org_id
  WHERE id = NEW.id;
  
  RAISE NOTICE '[Trigger] ✅ Profile atualizado com nova organization_id';
  
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');
  
  RAISE NOTICE '[Trigger] ✅ User role owner criado para nova organização';
  
  RETURN NEW;
END;
$function$;