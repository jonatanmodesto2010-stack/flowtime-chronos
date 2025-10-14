-- Add is_active column to client_timelines table
ALTER TABLE public.client_timelines 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.client_timelines.is_active IS 'Indicates if the client is currently active';