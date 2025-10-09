-- Criar tabela super_admins
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Política RLS: super admins podem ver a si mesmos
CREATE POLICY "Super admins can view themselves"
ON public.super_admins FOR SELECT
USING (user_id = auth.uid());

-- Inserir super admin inicial (será inserido após o primeiro login)
-- Nota: Como o usuário já existe, vamos usar um trigger para inserir automaticamente
CREATE OR REPLACE FUNCTION public.ensure_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se é o email do super admin
  IF NEW.email = 'jonatanmodesto2010@gmail.com' THEN
    INSERT INTO public.super_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para inserir super admin automaticamente
CREATE TRIGGER on_auth_user_ensure_super_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_super_admin();

-- Criar função para verificar super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- Remover política antiga que bloqueia INSERT em organizations
DROP POLICY IF EXISTS "Organizations created via signup only" ON public.organizations;

-- Nova política: apenas super admin pode criar organizações
CREATE POLICY "Super admins can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Atualizar trigger handle_new_user_organization
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  existing_org_id UUID;
BEGIN
  -- Não criar organização automática para super admin
  IF public.is_super_admin(NEW.id) THEN
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
$$;