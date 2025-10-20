-- Add client_id column to client_timelines table
ALTER TABLE public.client_timelines
ADD COLUMN client_id TEXT;

-- Create index for better performance on client_id lookups
CREATE INDEX idx_client_timelines_client_id ON public.client_timelines(client_id);

-- Add comment to document the column
COMMENT ON COLUMN public.client_timelines.client_id IS 'Unique identifier for the client, displayed alongside client name';