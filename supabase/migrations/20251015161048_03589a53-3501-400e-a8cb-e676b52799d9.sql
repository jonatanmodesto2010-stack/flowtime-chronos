-- Corrigir função sem search_path definido
CREATE OR REPLACE FUNCTION public.prevent_start_date_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.start_date IS NOT NULL AND NEW.start_date != OLD.start_date THEN
    RAISE EXCEPTION 'Não é permitido alterar a data de início após a criação do cliente';
  END IF;
  RETURN NEW;
END;
$$;