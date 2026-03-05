-- Remove duplicate boletos: keep only the oldest record for each (timeline_id, description) pair
DELETE FROM public.client_boletos
WHERE id NOT IN (
  SELECT DISTINCT ON (timeline_id, description) id
  FROM public.client_boletos
  ORDER BY timeline_id, description, created_at ASC
);

-- Also remove boletos from inactive/completed timelines that also exist on an active timeline
DELETE FROM public.client_boletos cb
WHERE EXISTS (
  SELECT 1 FROM client_timelines ct 
  WHERE ct.id = cb.timeline_id 
  AND ct.is_active = false
  AND EXISTS (
    SELECT 1 FROM client_boletos cb2
    JOIN client_timelines ct2 ON ct2.id = cb2.timeline_id
    WHERE ct2.client_id = ct.client_id
    AND ct2.organization_id = ct.organization_id
    AND ct2.is_active = true
    AND cb2.description = cb.description
  )
);