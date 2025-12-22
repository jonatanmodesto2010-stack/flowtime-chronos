-- =====================================================
-- ESQUEMA COMPLETO DO BANCO DE DADOS
-- Sistema de Gestão de Clientes e Timelines
-- =====================================================

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- =====================================================
-- 2. TABELAS PRINCIPAIS
-- =====================================================

-- Organizações
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    events_per_line_limit INTEGER NOT NULL DEFAULT 28,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Roles de usuário (separado do perfil por segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, organization_id)
);

-- Super admins
CREATE TABLE public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tags
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#ef4444',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (organization_id, name)
);

-- Ícones da organização
CREATE TABLE public.organization_icons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    icon TEXT NOT NULL,
    label TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Filtros da organização
CREATE TABLE public.organization_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID,
    page_name TEXT NOT NULL,
    filter_data JSONB NOT NULL DEFAULT '{}',
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Timelines de clientes
CREATE TABLE public.client_timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    organization_id UUID REFERENCES public.organizations(id),
    client_id TEXT,
    client_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    due_date DATE,
    boleto_value NUMERIC,
    status TEXT NOT NULL DEFAULT 'active',
    is_active BOOLEAN NOT NULL DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tags associadas às timelines
CREATE TABLE public.client_timeline_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (timeline_id, tag_id)
);

-- Boletos dos clientes
CREATE TABLE public.client_boletos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
    boleto_value NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Histórico de análise de clientes
CREATE TABLE public.client_analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Linhas da timeline
CREATE TABLE public.timeline_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Eventos da timeline
CREATE TABLE public.timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID NOT NULL REFERENCES public.timeline_lines(id) ON DELETE CASCADE,
    event_date TEXT NOT NULL,
    event_time TEXT,
    event_order INTEGER NOT NULL DEFAULT 0,
    icon TEXT NOT NULL DEFAULT '💬',
    icon_size TEXT NOT NULL DEFAULT 'text-2xl',
    description TEXT,
    position TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Versões do app
CREATE TABLE public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    build_version TEXT NOT NULL,
    build_time TIMESTAMP WITH TIME ZONE NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
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

-- Função para obter a organização do usuário
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Função para verificar se usuário pertence a uma organização
CREATE OR REPLACE FUNCTION public.user_in_organization(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
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

-- Função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- Função para gerar ID sequencial do cliente
CREATE OR REPLACE FUNCTION public.generate_client_sequential_id(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  new_id TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(client_id, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
  INTO next_number
  FROM client_timelines
  WHERE organization_id = org_id
  AND client_id IS NOT NULL
  AND client_id ~ '^[0-9]+$';
  
  new_id := LPAD(next_number::TEXT, 5, '0');
  RETURN new_id;
END;
$$;

-- Função para definir client_id automaticamente
CREATE OR REPLACE FUNCTION public.set_client_id_if_null()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL OR NEW.client_id = '' THEN
    NEW.client_id := generate_client_sequential_id(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Função para criar linha de timeline automaticamente
CREATE OR REPLACE FUNCTION public.create_timeline_line_for_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.timeline_lines (timeline_id, position)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$;

-- Função para criar tag padrão para organização
CREATE OR REPLACE FUNCTION public.create_default_tag_for_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tags (organization_id, name, color)
  VALUES (NEW.id, 'COBRANÇA', '#ef4444')
  ON CONFLICT (organization_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Função para prevenir alteração de start_date
CREATE OR REPLACE FUNCTION public.prevent_start_date_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.start_date IS NOT NULL AND NEW.start_date != OLD.start_date THEN
    RAISE EXCEPTION 'Não é permitido alterar a data de início após a criação do cliente';
  END IF;
  RETURN NEW;
END;
$$;

-- Função para atualizar auditoria da timeline
CREATE OR REPLACE FUNCTION public.update_timeline_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_timelines
  SET 
    user_id = auth.uid(),
    updated_at = now()
  WHERE id = (
    SELECT timeline_id 
    FROM public.timeline_lines 
    WHERE id = COALESCE(NEW.line_id, OLD.line_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Função para obter usuários da organização
CREATE OR REPLACE FUNCTION public.get_organization_users(_org_id UUID)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role app_role,
  user_role_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Função para adicionar usuário à organização
CREATE OR REPLACE FUNCTION public.add_user_to_organization(_user_id UUID, _organization_id UUID, _role app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para adicionar usuários';
  END IF;
  
  IF NOT user_in_organization(auth.uid(), _organization_id) THEN
    RAISE EXCEPTION 'Você não pertence a esta organização';
  END IF;
  
  UPDATE public.profiles
  SET organization_id = _organization_id
  WHERE id = _user_id;
  
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (_user_id, _organization_id, _role)
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET role = EXCLUDED.role;
END;
$$;

-- Função para lidar com novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
BEGIN
  -- Criar profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::text, 'Usuário')
  );

  -- Verificar se é super admin
  IF public.is_super_admin(NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Verificar se foi criado por admin
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

  -- Criar nova organização para usuários normais
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

-- Função para prevenir escalação de privilégios
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = auth.uid() AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
  END IF;
  
  IF NEW.role = 'owner' AND NOT public.has_role(auth.uid(), 'owner'::app_role) THEN
    RAISE EXCEPTION 'Only owners can assign owner role';
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger para criar profile quando usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_complete();

-- Trigger para criar tag padrão quando organização é criada
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_default_tag_for_organization();

-- Trigger para criar linha de timeline quando cliente é criado
CREATE TRIGGER on_client_timeline_created
  AFTER INSERT ON public.client_timelines
  FOR EACH ROW EXECUTE FUNCTION public.create_timeline_line_for_client();

-- Trigger para definir client_id automaticamente
CREATE TRIGGER set_client_id_trigger
  BEFORE INSERT ON public.client_timelines
  FOR EACH ROW EXECUTE FUNCTION public.set_client_id_if_null();

-- Trigger para prevenir alteração de start_date
CREATE TRIGGER prevent_start_date_change_trigger
  BEFORE UPDATE ON public.client_timelines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_start_date_change();

-- Trigger para atualizar auditoria ao modificar eventos
CREATE TRIGGER update_timeline_audit_on_event_change
  AFTER INSERT OR UPDATE OR DELETE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.update_timeline_audit();

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_timelines_updated_at
  BEFORE UPDATE ON public.client_timelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_boletos_updated_at
  BEFORE UPDATE ON public.client_boletos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para prevenir escalação de privilégios
CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_icons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_timeline_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5.1 Políticas para ORGANIZATIONS
-- =====================================================

CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (user_in_organization(auth.uid(), id));

CREATE POLICY "Owners and admins can update organization"
ON public.organizations FOR UPDATE
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only owners can delete organizations"
ON public.organizations FOR DELETE
USING (has_role(auth.uid(), 'owner'::app_role) AND user_in_organization(auth.uid(), id));

CREATE POLICY "Super admins can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 5.2 Políticas para PROFILES
-- =====================================================

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Deny viewing other profiles"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Profiles are created via trigger only"
ON public.profiles FOR INSERT
WITH CHECK (false);

CREATE POLICY "Profiles cannot be deleted"
ON public.profiles FOR DELETE
USING (false);

-- =====================================================
-- 5.3 Políticas para USER_ROLES
-- =====================================================

CREATE POLICY "Users can view roles with restrictions"
ON public.user_roles FOR SELECT
USING (
  (organization_id = get_user_organization(auth.uid())) 
  AND (
    has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR (user_id = auth.uid())
  )
);

CREATE POLICY "Owners and admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Owners and admins can update roles"
ON public.user_roles FOR UPDATE
USING (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Users cannot modify their own role"
ON public.user_roles FOR UPDATE
USING (user_id <> auth.uid());

CREATE POLICY "Owners and admins can delete roles"
ON public.user_roles FOR DELETE
USING (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

-- =====================================================
-- 5.4 Políticas para SUPER_ADMINS
-- =====================================================

CREATE POLICY "Super admins can view themselves"
ON public.super_admins FOR SELECT
USING (user_id = auth.uid());

-- =====================================================
-- 5.5 Políticas para TAGS
-- =====================================================

CREATE POLICY "Users can view tags in their organization"
ON public.tags FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Owners and admins can insert tags"
ON public.tags FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Owners and admins can update tags"
ON public.tags FOR UPDATE
USING (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Owners and admins can delete tags"
ON public.tags FOR DELETE
USING (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

-- =====================================================
-- 5.6 Políticas para ORGANIZATION_ICONS
-- =====================================================

CREATE POLICY "Users can view icons from their organization"
ON public.organization_icons FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can insert icons"
ON public.organization_icons FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

CREATE POLICY "Admins can delete icons"
ON public.organization_icons FOR DELETE
USING (
  (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) 
  AND (organization_id = get_user_organization(auth.uid()))
);

-- =====================================================
-- 5.7 Políticas para ORGANIZATION_FILTERS
-- =====================================================

CREATE POLICY "Users can view their own filters"
ON public.organization_filters FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own filters"
ON public.organization_filters FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5.8 Políticas para CLIENT_TIMELINES
-- =====================================================

CREATE POLICY "Users can view timelines in their organization"
ON public.client_timelines FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Users can insert timelines in their organization"
ON public.client_timelines FOR INSERT
WITH CHECK (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Members can update all timelines in organization"
ON public.client_timelines FOR UPDATE
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Members can delete all timelines in organization"
ON public.client_timelines FOR DELETE
USING (organization_id = get_user_organization(auth.uid()));

-- =====================================================
-- 5.9 Políticas para CLIENT_TIMELINE_TAGS
-- =====================================================

CREATE POLICY "Users can view timeline tags in their organization"
ON public.client_timeline_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_timelines ct
    WHERE ct.id = client_timeline_tags.timeline_id 
    AND ct.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "Members can manage timeline tags in their organization"
ON public.client_timeline_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM client_timelines ct
    WHERE ct.id = client_timeline_tags.timeline_id 
    AND ct.organization_id = get_user_organization(auth.uid())
  )
);

-- =====================================================
-- 5.10 Políticas para CLIENT_BOLETOS
-- =====================================================

CREATE POLICY "Users can view boletos from their organization"
ON public.client_boletos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_timelines ct
    WHERE ct.id = client_boletos.timeline_id 
    AND ct.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "Users can manage boletos from their organization"
ON public.client_boletos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM client_timelines ct
    WHERE ct.id = client_boletos.timeline_id 
    AND ct.organization_id = get_user_organization(auth.uid())
  )
);

-- =====================================================
-- 5.11 Políticas para CLIENT_ANALYSIS_HISTORY
-- =====================================================

CREATE POLICY "Users can view analysis from their organization"
ON public.client_analysis_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_timelines ct
    WHERE ct.id = client_analysis_history.timeline_id 
    AND ct.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "Users can create analysis for their organization"
ON public.client_analysis_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_timelines ct
    WHERE ct.id = client_analysis_history.timeline_id 
    AND ct.organization_id = get_user_organization(auth.uid())
  )
);

-- =====================================================
-- 5.12 Políticas para TIMELINE_LINES
-- =====================================================

CREATE POLICY "Members can view lines from organization timelines"
ON public.timeline_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_timelines
    WHERE client_timelines.id = timeline_lines.timeline_id 
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "Members can manage lines from organization timelines"
ON public.timeline_lines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM client_timelines
    WHERE client_timelines.id = timeline_lines.timeline_id 
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

-- =====================================================
-- 5.13 Políticas para TIMELINE_EVENTS
-- =====================================================

CREATE POLICY "Members can view events from organization timelines"
ON public.timeline_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM timeline_lines
    JOIN client_timelines ON client_timelines.id = timeline_lines.timeline_id
    WHERE timeline_lines.id = timeline_events.line_id 
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "Members can manage events from organization timelines"
ON public.timeline_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM timeline_lines
    JOIN client_timelines ON client_timelines.id = timeline_lines.timeline_id
    WHERE timeline_lines.id = timeline_events.line_id 
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

-- =====================================================
-- 5.14 Políticas para APP_VERSIONS
-- =====================================================

CREATE POLICY "Only super admins can read versions"
ON public.app_versions FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Service role can manage versions"
ON public.app_versions FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- FIM DO ESQUEMA
-- =====================================================
