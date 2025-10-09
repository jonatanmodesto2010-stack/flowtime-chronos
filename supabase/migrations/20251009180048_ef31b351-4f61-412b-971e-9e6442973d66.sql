-- Create table for app version tracking
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  build_version TEXT NOT NULL,
  build_time TIMESTAMPTZ NOT NULL,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast active version lookups
CREATE INDEX idx_app_versions_active ON public.app_versions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read versions
CREATE POLICY "Anyone authenticated can read versions"
  ON public.app_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage versions"
  ON public.app_versions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);