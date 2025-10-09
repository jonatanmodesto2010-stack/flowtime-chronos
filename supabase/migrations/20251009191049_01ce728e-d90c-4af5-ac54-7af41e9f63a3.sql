-- Priority 1: Prevent privilege escalation - users cannot modify their own role
CREATE POLICY "Users cannot modify their own role"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id != auth.uid());

-- Create function to prevent self-role escalation
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from modifying their own role
  IF NEW.user_id = auth.uid() AND OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
  END IF;
  
  -- Prevent admins from promoting to owner without being owner themselves
  IF NEW.role = 'owner' AND NOT public.has_role(auth.uid(), 'owner'::app_role) THEN
    RAISE EXCEPTION 'Only owners can assign owner role';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to user_roles table
CREATE TRIGGER enforce_role_modification_rules
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- Priority 2: Strengthen profile access control - ensure users can ONLY view their own profile
CREATE POLICY "Deny viewing other profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Priority 4: Restrict app version access to super admins only
DROP POLICY IF EXISTS "Anyone authenticated can read versions" ON public.app_versions;

CREATE POLICY "Only super admins can read versions"
ON public.app_versions
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));