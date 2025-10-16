-- Criar tabela para armazenar filtros compartilhados por organização
CREATE TABLE public.organization_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  filter_data JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, page_name)
);

-- Índice para busca rápida
CREATE INDEX idx_org_filters_org_page ON public.organization_filters(organization_id, page_name);

-- Habilitar RLS
ALTER TABLE public.organization_filters ENABLE ROW LEVEL SECURITY;

-- Usuários podem visualizar filtros da sua organização
CREATE POLICY "Users can view filters from their organization"
ON public.organization_filters
FOR SELECT
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

-- Usuários podem atualizar filtros da sua organização
CREATE POLICY "Users can update filters from their organization"
ON public.organization_filters
FOR ALL
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organization_filters_updated_at
  BEFORE UPDATE ON public.organization_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_filters;