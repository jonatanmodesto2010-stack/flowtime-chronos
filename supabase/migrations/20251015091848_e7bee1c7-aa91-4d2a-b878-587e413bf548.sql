-- Create table to store AI analysis history
CREATE TABLE IF NOT EXISTS public.client_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('baixo', 'médio', 'alto', 'crítico')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_analysis_timeline_date 
ON public.client_analysis_history(timeline_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.client_analysis_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analysis from their organization
CREATE POLICY "Users can view analysis from their organization"
  ON public.client_analysis_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_timelines ct
      WHERE ct.id = client_analysis_history.timeline_id
      AND ct.organization_id = get_user_organization(auth.uid())
    )
  );

-- Policy: Users can create analysis for their organization
CREATE POLICY "Users can create analysis for their organization"
  ON public.client_analysis_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_timelines ct
      WHERE ct.id = client_analysis_history.timeline_id
      AND ct.organization_id = get_user_organization(auth.uid())
    )
  );