-- ============================================
-- SECURITY FIXES: RLS Policies & Schema Updates
-- ============================================

-- ============================================
-- PART 1: Fix timeline_lines and timeline_events RLS
-- Allow organization-wide visibility
-- ============================================

-- Drop old user_id-based policies on timeline_lines
DROP POLICY IF EXISTS "Users can view lines from their timelines" ON timeline_lines;
DROP POLICY IF EXISTS "Users can insert lines to their timelines" ON timeline_lines;
DROP POLICY IF EXISTS "Users can update lines from their timelines" ON timeline_lines;
DROP POLICY IF EXISTS "Users can delete lines from their timelines" ON timeline_lines;

-- Drop old user_id-based policies on timeline_events
DROP POLICY IF EXISTS "Users can view events from their timelines" ON timeline_events;
DROP POLICY IF EXISTS "Users can insert events to their timelines" ON timeline_events;
DROP POLICY IF EXISTS "Users can update events from their timelines" ON timeline_events;
DROP POLICY IF EXISTS "Users can delete events from their timelines" ON timeline_events;

-- Create new organization-based policies for timeline_lines
CREATE POLICY "Members can view lines from organization timelines"
ON timeline_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_timelines
    WHERE client_timelines.id = timeline_lines.timeline_id
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "Members can manage lines from organization timelines"
ON timeline_lines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM client_timelines
    WHERE client_timelines.id = timeline_lines.timeline_id
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

-- Create new organization-based policies for timeline_events
CREATE POLICY "Members can view events from organization timelines"
ON timeline_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM timeline_lines
    JOIN client_timelines ON client_timelines.id = timeline_lines.timeline_id
    WHERE timeline_lines.id = timeline_events.line_id
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "Members can manage events from organization timelines"
ON timeline_events FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM timeline_lines
    JOIN client_timelines ON client_timelines.id = timeline_lines.timeline_id
    WHERE timeline_lines.id = timeline_events.line_id
    AND client_timelines.organization_id = get_user_organization(auth.uid())
  )
);

-- ============================================
-- PART 2: Add Missing RLS Policies for profiles
-- ============================================

-- Prevent unauthorized profile creation (only via trigger)
CREATE POLICY "Profiles are created via trigger only"
ON public.profiles
FOR INSERT
WITH CHECK (false);

-- Prevent profile deletion
CREATE POLICY "Profiles cannot be deleted"
ON public.profiles  
FOR DELETE
USING (false);

-- ============================================
-- PART 3: Add Missing RLS Policies for organizations
-- ============================================

-- Only allow organization creation via trigger during signup
CREATE POLICY "Organizations created via signup only"
ON public.organizations
FOR INSERT
WITH CHECK (false);

-- Only allow owners to delete organizations
CREATE POLICY "Only owners can delete organizations"
ON public.organizations
FOR DELETE
USING (
  has_role(auth.uid(), 'owner'::app_role) 
  AND user_in_organization(auth.uid(), id)
);

-- ============================================
-- PART 4: Remove deprecated role column from profiles
-- ============================================

ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS role;