-- Tabela de tags por organização
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ef4444',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Habilitar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver tags da sua organização
CREATE POLICY "Users can view tags in their organization"
  ON public.tags
  FOR SELECT
  USING (organization_id = get_user_organization(auth.uid()));

-- Policy: Owners e admins podem inserir tags
CREATE POLICY "Owners and admins can insert tags"
  ON public.tags
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

-- Policy: Owners e admins podem atualizar tags
CREATE POLICY "Owners and admins can update tags"
  ON public.tags
  FOR UPDATE
  USING (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

-- Policy: Owners e admins podem deletar tags
CREATE POLICY "Owners and admins can delete tags"
  ON public.tags
  FOR DELETE
  USING (
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND organization_id = get_user_organization(auth.uid())
  );

-- Trigger para updated_at
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Relacionamento muitos-para-muitos entre timelines e tags
CREATE TABLE public.client_timeline_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES public.client_timelines(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(timeline_id, tag_id)
);

-- Habilitar RLS
ALTER TABLE public.client_timeline_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver tags de timelines da sua organização
CREATE POLICY "Users can view timeline tags in their organization"
  ON public.client_timeline_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_timelines ct
      WHERE ct.id = timeline_id
        AND ct.organization_id = get_user_organization(auth.uid())
    )
  );

-- Policy: Membros podem gerenciar tags de timelines
CREATE POLICY "Members can manage timeline tags in their organization"
  ON public.client_timeline_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_timelines ct
      WHERE ct.id = timeline_id
        AND ct.organization_id = get_user_organization(auth.uid())
    )
  );

-- Função para criar tag COBRANÇA automaticamente
CREATE OR REPLACE FUNCTION create_default_tag_for_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tags (organization_id, name, color)
  VALUES (NEW.id, 'COBRANÇA', '#ef4444')
  ON CONFLICT (organization_id, name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar tag ao criar organização
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_tag_for_organization();

-- Inserir tag para organizações existentes
INSERT INTO public.tags (organization_id, name, color)
SELECT id, 'COBRANÇA', '#ef4444'
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;