
CREATE OR REPLACE FUNCTION public.batch_upsert_boletos(
  p_ids uuid[],
  p_values numeric[],
  p_dates date[],
  p_statuses text[]
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE client_boletos SET
    boleto_value = d.val,
    due_date = d.dd,
    status = d.st,
    updated_at = now()
  FROM unnest(p_ids, p_values, p_dates, p_statuses) AS d(id, val, dd, st)
  WHERE client_boletos.id = d.id;
$$;

CREATE OR REPLACE FUNCTION public.batch_upsert_clients(
  p_ids uuid[],
  p_names text[],
  p_active boolean[],
  p_statuses text[]
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE client_timelines SET
    client_name = d.nm,
    is_active = d.act,
    status = d.st,
    updated_at = now()
  FROM unnest(p_ids, p_names, p_active, p_statuses) AS d(id, nm, act, st)
  WHERE client_timelines.id = d.id;
$$;
