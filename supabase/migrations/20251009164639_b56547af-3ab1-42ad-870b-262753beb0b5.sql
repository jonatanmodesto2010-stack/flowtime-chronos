-- Remover todos os triggers existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_user_profile_created ON public.profiles;

-- Agora remover as funções
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_organization();

-- Criar função unificada que lida com profile, organização e roles
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
BEGIN
  -- 1. Criar profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'full_name')::text,
      'Usuário'
    )
  );

  -- 2. Verificar se é super admin - não criar organização
  IF public.is_super_admin(NEW.id) THEN
    RETURN NEW;
  END IF;

  -- 3. Se foi criado por admin - usar organização fornecida
  IF (NEW.raw_user_meta_data->>'created_by_admin')::boolean IS TRUE THEN
    UPDATE public.profiles
    SET organization_id = (NEW.raw_user_meta_data->>'organization_id')::uuid
    WHERE id = NEW.id;
    
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (
      NEW.id, 
      (NEW.raw_user_meta_data->>'organization_id')::uuid,
      (NEW.raw_user_meta_data->>'role')::app_role
    );
    
    RETURN NEW;
  END IF;

  -- 4. Criar organização para novo usuário owner
  user_name := COALESCE((NEW.raw_user_meta_data->>'full_name')::text, 'Usuário');
  
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
$$;

-- Criar trigger único na tabela auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();