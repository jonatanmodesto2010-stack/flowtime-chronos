-- Função que cria timeline_line automaticamente quando um cliente é criado
CREATE OR REPLACE FUNCTION public.create_timeline_line_for_client()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  -- Criar uma linha de timeline com position 0 para o novo cliente
  INSERT INTO public.timeline_lines (timeline_id, position)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

-- Trigger que dispara APÓS a inserção de um novo cliente
CREATE TRIGGER after_client_timeline_insert
AFTER INSERT ON public.client_timelines
FOR EACH ROW
EXECUTE FUNCTION public.create_timeline_line_for_client();