
CREATE TABLE public.integration_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sync_type text NOT NULL, -- 'clients' or 'boletos'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'success', 'error'
  records_processed integer DEFAULT 0,
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.integration_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync logs from their organization"
  ON public.integration_sync_log FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Service role can manage sync logs"
  ON public.integration_sync_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
