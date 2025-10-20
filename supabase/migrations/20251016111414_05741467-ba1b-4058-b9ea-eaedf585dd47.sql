-- Criar função para atualizar auditoria da timeline quando eventos mudarem
CREATE OR REPLACE FUNCTION public.update_timeline_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar o client_timelines com user_id e updated_at
  UPDATE public.client_timelines
  SET 
    user_id = auth.uid(),
    updated_at = now()
  WHERE id = (
    SELECT timeline_id 
    FROM public.timeline_lines 
    WHERE id = COALESCE(NEW.line_id, OLD.line_id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger para INSERT
CREATE TRIGGER update_timeline_audit_on_event_insert
AFTER INSERT ON public.timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.update_timeline_audit();

-- Criar trigger para UPDATE
CREATE TRIGGER update_timeline_audit_on_event_update
AFTER UPDATE ON public.timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.update_timeline_audit();

-- Criar trigger para DELETE
CREATE TRIGGER update_timeline_audit_on_event_delete
AFTER DELETE ON public.timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.update_timeline_audit();