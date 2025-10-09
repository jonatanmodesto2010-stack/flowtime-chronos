-- Corrigir função handle_new_user_organization
-- O problema é que quando disparado por trigger em profiles, NEW refere-se a profiles, não auth.users
-- Portanto, NEW.raw_user_meta_data não existe - devemos usar NEW.full_name

DROP FUNCTION IF EXISTS public.handle_new_user_organization() CASCADE;

-- Recriar a função usando NEW.full_name ao invés de NEW.raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  -- Obter nome do usuário do campo full_name da tabela profiles
  user_name := COALESCE(NEW.full_name, 'Usuário');
  
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
$$;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_user_profile_created ON public.profiles;

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_organization();