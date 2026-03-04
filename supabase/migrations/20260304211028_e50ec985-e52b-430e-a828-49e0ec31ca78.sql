
CREATE TABLE public.organization_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_type text NOT NULL DEFAULT 'ixc',
  api_url text,
  api_token text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, integration_type)
);

ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;

-- Only owners/admins can view integration configs in their org
CREATE POLICY "Owners and admins can view integrations"
ON public.organization_integrations
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Only owners/admins can insert
CREATE POLICY "Owners and admins can insert integrations"
ON public.organization_integrations
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Only owners/admins can update
CREATE POLICY "Owners and admins can update integrations"
ON public.organization_integrations
FOR UPDATE
TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Only owners can delete
CREATE POLICY "Owners can delete integrations"
ON public.organization_integrations
FOR DELETE
TO authenticated
USING (
  organization_id = get_user_organization(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
);
