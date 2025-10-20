-- Add event_time column to timeline_events table
ALTER TABLE public.timeline_events 
ADD COLUMN event_time text;

-- Add index for better query performance when filtering by time
CREATE INDEX idx_timeline_events_time ON public.timeline_events(event_time);