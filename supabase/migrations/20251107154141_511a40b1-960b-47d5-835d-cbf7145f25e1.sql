-- Criar tabela para gerenciar ícones por organização
CREATE TABLE public.organization_icons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  icon TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, icon)
);

-- Índice para melhor performance
CREATE INDEX idx_organization_icons_org_id ON public.organization_icons(organization_id);

-- Habilitar RLS
ALTER TABLE public.organization_icons ENABLE ROW LEVEL SECURITY;

-- Policy: Membros podem ver ícones da organização
CREATE POLICY "Users can view icons from their organization"
  ON public.organization_icons
  FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

-- Policy: Admins e owners podem inserir ícones
CREATE POLICY "Admins can insert icons"
  ON public.organization_icons
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

-- Policy: Admins e owners podem deletar ícones
CREATE POLICY "Admins can delete icons"
  ON public.organization_icons
  FOR DELETE
  USING (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

-- Popular com ícones padrão para organizações existentes
INSERT INTO public.organization_icons (organization_id, icon, label)
SELECT 
  o.id,
  unnest(ARRAY['💬', '📅', '📄', '📞', '✅', '🤝', '⚠️', '🧰']),
  unnest(ARRAY['Mensagem', 'Calendário', 'Documento', 'Telefone', 'Concluído', 'Acordo', 'Alerta', 'Manutenção'])
FROM public.organizations o;