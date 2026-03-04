CREATE POLICY "Members can cancel sync logs"
ON public.integration_sync_log
FOR UPDATE
TO authenticated
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));