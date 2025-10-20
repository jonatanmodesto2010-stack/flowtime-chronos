-- Adicionar coluna user_id para filtros independentes por usuário
ALTER TABLE organization_filters 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover constraint antiga (organization_id, page_name)
ALTER TABLE organization_filters 
  DROP CONSTRAINT IF EXISTS organization_filters_organization_id_page_name_key;

-- Criar novo constraint único (organization_id, page_name, user_id)
CREATE UNIQUE INDEX IF NOT EXISTS organization_filters_org_page_user_key 
  ON organization_filters (organization_id, page_name, user_id);

-- Limpar dados existentes (filtros não são críticos para migração limpa)
TRUNCATE TABLE organization_filters;

-- Atualizar RLS policies para filtrar por user_id
DROP POLICY IF EXISTS "Users can view filters from their organization" ON organization_filters;
DROP POLICY IF EXISTS "Users can update filters from their organization" ON organization_filters;

CREATE POLICY "Users can view their own filters"
  ON organization_filters FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own filters"
  ON organization_filters FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());