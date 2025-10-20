-- Etapa 1: Estrutura de Banco de Dados - Sistema de Organizações e Permissões

-- 1. Criar ENUM para roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 2. Criar tabela de organizações
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  events_per_line_limit INTEGER NOT NULL DEFAULT 28,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Criar tabela de roles de usuários (CRÍTICO para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 4. Adicionar organization_id às tabelas existentes
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.client_timelines
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Função security definer para verificar role (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 7. Função para obter organização do usuário
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 8. Função para verificar se usuário pertence a uma organização
CREATE OR REPLACE FUNCTION public.user_in_organization(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- 9. RLS Policies para organizations
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (public.user_in_organization(auth.uid(), id));

CREATE POLICY "Owners and admins can update organization"
ON public.organizations
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'owner') OR 
  public.has_role(auth.uid(), 'admin')
);

-- 10. RLS Policies para user_roles
CREATE POLICY "Users can view roles in their organization"
ON public.user_roles
FOR SELECT
USING (
  organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Owners and admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Owners and admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Owners and admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  AND organization_id = public.get_user_organization(auth.uid())
);

-- 11. Atualizar RLS policies de client_timelines para acesso por organização
DROP POLICY IF EXISTS "Users can view their own timelines" ON public.client_timelines;
DROP POLICY IF EXISTS "Users can insert their own timelines" ON public.client_timelines;
DROP POLICY IF EXISTS "Users can update their own timelines" ON public.client_timelines;
DROP POLICY IF EXISTS "Users can delete their own timelines" ON public.client_timelines;

CREATE POLICY "Users can view timelines in their organization"
ON public.client_timelines
FOR SELECT
USING (
  organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Users can insert timelines in their organization"
ON public.client_timelines
FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Members can update all timelines in organization"
ON public.client_timelines
FOR UPDATE
USING (
  organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Members can delete all timelines in organization"
ON public.client_timelines
FOR DELETE
USING (
  organization_id = public.get_user_organization(auth.uid())
);

-- 12. Trigger para criar organização quando novo usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
BEGIN
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
$$;

-- Trigger executado após criação do profile
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_organization();

-- 13. Atualizar trigger de updated_at para organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Migração de dados existentes
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
BEGIN
  -- Para cada usuário existente sem organização
  FOR user_record IN 
    SELECT p.id, p.full_name 
    FROM public.profiles p
    WHERE p.organization_id IS NULL
  LOOP
    -- Criar organização
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(user_record.full_name, 'Usuário') || '''s Organization')
    RETURNING id INTO new_org_id;
    
    -- Atualizar profile
    UPDATE public.profiles
    SET organization_id = new_org_id
    WHERE id = user_record.id;
    
    -- Adicionar como owner
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (user_record.id, new_org_id, 'owner');
    
    -- Atualizar client_timelines existentes
    UPDATE public.client_timelines
    SET organization_id = new_org_id
    WHERE user_id = user_record.id;
  END LOOP;
END $$;