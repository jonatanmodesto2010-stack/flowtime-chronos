-- Migração Completa do Schema (com verificações de existência)

-- 1. Criar tipo enum apenas se não existir
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Criar tabela organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  events_per_line_limit INTEGER NOT NULL DEFAULT 28,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Criar tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 5. Criar tabela client_timelines
CREATE TABLE IF NOT EXISTS public.client_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  client_name TEXT NOT NULL,
  client_id TEXT,
  start_date DATE NOT NULL,
  boleto_value NUMERIC,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Criar tabela timeline_lines
CREATE TABLE IF NOT EXISTS public.timeline_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Criar tabela timeline_events
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.timeline_lines(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  event_time TEXT,
  description TEXT,
  position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  icon TEXT NOT NULL DEFAULT '💬',
  icon_size TEXT NOT NULL DEFAULT 'text-2xl',
  event_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Criar funções de segurança
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_in_organization(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. Criar função para criação de profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'full_name')::text,
      'Usuário'
    )
  );
  RETURN NEW;
END;
$$;

-- 10. Criar função para criação de organização
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

-- 11. Criar triggers (drop e recria para garantir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_organization();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_timelines_updated_at ON public.client_timelines;
CREATE TRIGGER update_client_timelines_updated_at
  BEFORE UPDATE ON public.client_timelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_timeline_events_updated_at ON public.timeline_events;
CREATE TRIGGER update_timeline_events_updated_at
  BEFORE UPDATE ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies para profiles (drop e recria)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles are created via trigger only" ON public.profiles;
CREATE POLICY "Profiles are created via trigger only"
  ON public.profiles FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Profiles cannot be deleted" ON public.profiles;
CREATE POLICY "Profiles cannot be deleted"
  ON public.profiles FOR DELETE
  USING (false);

-- 14. RLS Policies para organizations
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (user_in_organization(auth.uid(), id));

DROP POLICY IF EXISTS "Owners and admins can update organization" ON public.organizations;
CREATE POLICY "Owners and admins can update organization"
  ON public.organizations FOR UPDATE
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Organizations created via signup only" ON public.organizations;
CREATE POLICY "Organizations created via signup only"
  ON public.organizations FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Only owners can delete organizations" ON public.organizations;
CREATE POLICY "Only owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (has_role(auth.uid(), 'owner'::app_role) AND user_in_organization(auth.uid(), id));

-- 15. RLS Policies para user_roles
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;
CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can insert roles" ON public.user_roles;
CREATE POLICY "Owners and admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

DROP POLICY IF EXISTS "Owners and admins can update roles" ON public.user_roles;
CREATE POLICY "Owners and admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

DROP POLICY IF EXISTS "Owners and admins can delete roles" ON public.user_roles;
CREATE POLICY "Owners and admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

-- 16. RLS Policies para client_timelines
DROP POLICY IF EXISTS "Users can view timelines in their organization" ON public.client_timelines;
CREATE POLICY "Users can view timelines in their organization"
  ON public.client_timelines FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Users can insert timelines in their organization" ON public.client_timelines;
CREATE POLICY "Users can insert timelines in their organization"
  ON public.client_timelines FOR INSERT
  WITH CHECK (organization_id = get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Members can update all timelines in organization" ON public.client_timelines;
CREATE POLICY "Members can update all timelines in organization"
  ON public.client_timelines FOR UPDATE
  USING (organization_id = get_user_organization(auth.uid()));

DROP POLICY IF EXISTS "Members can delete all timelines in organization" ON public.client_timelines;
CREATE POLICY "Members can delete all timelines in organization"
  ON public.client_timelines FOR DELETE
  USING (organization_id = get_user_organization(auth.uid()));

-- 17. RLS Policies para timeline_lines
DROP POLICY IF EXISTS "Members can view lines from organization timelines" ON public.timeline_lines;
CREATE POLICY "Members can view lines from organization timelines"
  ON public.timeline_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_timelines
      WHERE client_timelines.id = timeline_lines.timeline_id
        AND client_timelines.organization_id = get_user_organization(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can manage lines from organization timelines" ON public.timeline_lines;
CREATE POLICY "Members can manage lines from organization timelines"
  ON public.timeline_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM client_timelines
      WHERE client_timelines.id = timeline_lines.timeline_id
        AND client_timelines.organization_id = get_user_organization(auth.uid())
    )
  );

-- 18. RLS Policies para timeline_events
DROP POLICY IF EXISTS "Members can view events from organization timelines" ON public.timeline_events;
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

DROP POLICY IF EXISTS "Members can manage events from organization timelines" ON public.timeline_events;
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