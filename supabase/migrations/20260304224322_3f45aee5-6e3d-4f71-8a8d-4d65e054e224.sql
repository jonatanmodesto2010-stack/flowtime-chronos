CREATE UNIQUE INDEX IF NOT EXISTS idx_client_timelines_client_org 
ON public.client_timelines (client_id, organization_id) 
WHERE client_id IS NOT NULL;