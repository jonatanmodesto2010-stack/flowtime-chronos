
-- Step 1: Add column
ALTER TABLE public.client_boletos 
  ADD COLUMN IF NOT EXISTS ixc_boleto_id TEXT;

-- Step 2: Populate from existing description
UPDATE public.client_boletos
SET ixc_boleto_id = REGEXP_REPLACE(description, '^Fatura IXC #', '')
WHERE description LIKE 'Fatura IXC #%' AND ixc_boleto_id IS NULL;

-- Step 3: Clean duplicates - keep only the one with lowest id per (timeline_id, ixc_boleto_id)
DELETE FROM public.client_boletos
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY timeline_id, ixc_boleto_id 
      ORDER BY created_at ASC, id ASC
    ) AS rn
    FROM public.client_boletos
    WHERE ixc_boleto_id IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Step 4: Create unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_boletos_ixc_ref 
  ON public.client_boletos (timeline_id, ixc_boleto_id) 
  WHERE ixc_boleto_id IS NOT NULL;
