-- Fix 1: Add SET search_path to all SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.create_default_tag_for_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.tags (organization_id, name, color)
  VALUES (NEW.id, 'COBRANÇA', '#ef4444')
  ON CONFLICT (organization_id, name) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_client_sequential_id(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_start_date_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.start_date IS NOT NULL AND NEW.start_date != OLD.start_date THEN
    RAISE EXCEPTION 'Não é permitido alterar a data de início após a criação do cliente';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'jonatanmodesto2010@gmail.com' THEN
    INSERT INTO public.super_admins (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_user_to_organization(_user_id uuid, _organization_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix 2: Clean existing data first
UPDATE public.tags SET name = LEFT(name, 50) WHERE char_length(name) > 50;
UPDATE public.client_timelines SET client_name = LEFT(client_name, 150) WHERE char_length(client_name) > 150;
UPDATE public.client_timelines SET completion_notes = LEFT(completion_notes, 500) WHERE char_length(completion_notes) > 500;
UPDATE public.timeline_events SET description = LEFT(description, 150) WHERE char_length(description) > 150;
UPDATE public.organizations SET name = LEFT(name, 150) WHERE char_length(name) > 150;
UPDATE public.client_boletos SET description = LEFT(description, 200) WHERE char_length(description) > 200;

-- Fix 3: Add constraints after cleaning data
ALTER TABLE public.client_timelines 
  ADD CONSTRAINT client_name_length CHECK (char_length(client_name) <= 150),
  ADD CONSTRAINT completion_notes_length CHECK (completion_notes IS NULL OR char_length(completion_notes) <= 500);

ALTER TABLE public.timeline_events
  ADD CONSTRAINT description_length CHECK (description IS NULL OR char_length(description) <= 150);

ALTER TABLE public.tags
  ADD CONSTRAINT tag_name_length CHECK (char_length(name) <= 50);

ALTER TABLE public.organizations
  ADD CONSTRAINT org_name_length CHECK (char_length(name) <= 150);

ALTER TABLE public.client_boletos
  ADD CONSTRAINT boleto_description_length CHECK (description IS NULL OR char_length(description) <= 200),
  ADD CONSTRAINT boleto_value_positive CHECK (boleto_value > 0);

ALTER TABLE public.client_analysis_history
  ADD CONSTRAINT risk_score_bounds CHECK (risk_score >= 0 AND risk_score <= 100);