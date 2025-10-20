-- Associar tag COBRANÇA a todas as timelines existentes
INSERT INTO public.client_timeline_tags (timeline_id, tag_id)
SELECT 
  ct.id as timeline_id,
  t.id as tag_id
FROM public.client_timelines ct
CROSS JOIN public.tags t
WHERE t.name = 'COBRANÇA'
  AND ct.organization_id = t.organization_id
  AND NOT EXISTS (
    SELECT 1 FROM public.client_timeline_tags ctt
    WHERE ctt.timeline_id = ct.id AND ctt.tag_id = t.id
  );