-- Habilitar realtime para sincronização entre usuários
ALTER TABLE public.client_timelines REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_timelines;

ALTER TABLE public.timeline_lines REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_lines;

ALTER TABLE public.timeline_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_events;