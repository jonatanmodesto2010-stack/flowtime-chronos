-- ============================================
-- 1. Criar tabela de múltiplos boletos
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
  boleto_value NUMERIC(10, 2) NOT NULL CHECK (boleto_value >= 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_boletos_timeline_date 
ON public.client_boletos(timeline_id, due_date DESC);

-- RLS Policies para boletos
ALTER TABLE public.client_boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view boletos from their organization"
  ON public.client_boletos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_timelines ct
      WHERE ct.id = client_boletos.timeline_id
      AND ct.organization_id = get_user_organization(auth.uid())
    )
  );

CREATE POLICY "Users can manage boletos from their organization"
  ON public.client_boletos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_timelines ct
      WHERE ct.id = client_boletos.timeline_id
      AND ct.organization_id = get_user_organization(auth.uid())
    )
  );

-- ============================================
-- 2. Função para gerar ID sequencial
-- ============================================
CREATE OR REPLACE FUNCTION generate_client_sequential_id(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  new_id TEXT;
BEGIN
  -- Buscar o maior número existente para esta organização
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(client_id, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
  INTO next_number
  FROM client_timelines
  WHERE organization_id = org_id
  AND client_id IS NOT NULL
  AND client_id ~ '^[0-9]+$';
  
  -- Formatar como 5 dígitos (ex: 00001, 00002)
  new_id := LPAD(next_number::TEXT, 5, '0');
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Trigger para auto-gerar ID na criação
-- ============================================
CREATE OR REPLACE FUNCTION set_client_id_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL OR NEW.client_id = '' THEN
    NEW.client_id := generate_client_sequential_id(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_client_id ON public.client_timelines;

CREATE TRIGGER auto_generate_client_id
BEFORE INSERT ON public.client_timelines
FOR EACH ROW
EXECUTE FUNCTION set_client_id_if_null();

-- ============================================
-- 4. Trigger para proteger data de início
-- ============================================
CREATE OR REPLACE FUNCTION prevent_start_date_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.start_date IS NOT NULL AND NEW.start_date != OLD.start_date THEN
    -- Apenas avisar no log, não bloquear (para não quebrar edições legítimas)
    RAISE WARNING 'Tentativa de alterar start_date de % para %', OLD.start_date, NEW.start_date;
    -- Manter data original
    NEW.start_date := OLD.start_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_start_date ON public.client_timelines;

CREATE TRIGGER protect_start_date
BEFORE UPDATE ON public.client_timelines
FOR EACH ROW
EXECUTE FUNCTION prevent_start_date_change();

-- ============================================
-- 5. Atualizar timelines existentes com ID
-- ============================================
DO $$
DECLARE
  timeline_record RECORD;
BEGIN
  FOR timeline_record IN 
    SELECT id, organization_id 
    FROM client_timelines 
    WHERE client_id IS NULL OR client_id = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE client_timelines
    SET client_id = generate_client_sequential_id(timeline_record.organization_id)
    WHERE id = timeline_record.id;
  END LOOP;
END $$;