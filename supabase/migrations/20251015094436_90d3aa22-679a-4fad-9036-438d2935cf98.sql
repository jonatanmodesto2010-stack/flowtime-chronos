-- Add status column to client_timelines
ALTER TABLE public.client_timelines 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'completed', 'archived'));

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_client_timelines_status 
ON public.client_timelines(organization_id, status, created_at DESC);

-- Add completed_at column
ALTER TABLE public.client_timelines 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add completion_notes column
ALTER TABLE public.client_timelines 
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Update existing timelines to have 'active' status
UPDATE public.client_timelines 
SET status = 'active' 
WHERE status IS NULL;