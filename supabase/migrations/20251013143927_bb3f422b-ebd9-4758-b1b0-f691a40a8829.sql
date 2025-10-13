-- ============================================
-- MELHORIA DE SEGURANÇA: Restringir Visibilidade de Funções de Usuário
-- ============================================

-- Remover política antiga que permitia qualquer usuário ver todas as roles
DROP POLICY IF EXISTS "Users can view roles in their organization" ON user_roles;

-- Criar nova política: apenas admins/owners veem todas as roles
-- Usuários regulares veem apenas sua própria role
CREATE POLICY "Users can view roles with restrictions" 
ON user_roles FOR SELECT
USING (
  organization_id = get_user_organization(auth.uid())
  AND (
    has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
  )
);

-- ============================================
-- MELHORIA DE SEGURANÇA: Limites de Comprimento de Texto
-- ============================================

-- PASSO 1: Truncar dados existentes que excedem o limite de 150 caracteres

-- Truncar descrições de eventos
UPDATE timeline_events 
SET description = LEFT(description, 150) 
WHERE LENGTH(description) > 150;

-- Truncar nomes de clientes
UPDATE client_timelines 
SET client_name = LEFT(client_name, 150) 
WHERE LENGTH(client_name) > 150;

-- Truncar nomes de tags
UPDATE tags 
SET name = LEFT(name, 150) 
WHERE LENGTH(name) > 150;

-- Truncar nomes de organizações
UPDATE organizations 
SET name = LEFT(name, 150) 
WHERE LENGTH(name) > 150;

-- Truncar nomes completos de perfis
UPDATE profiles 
SET full_name = LEFT(full_name, 150) 
WHERE LENGTH(full_name) > 150;

-- PASSO 2: Adicionar constraints de comprimento após limpar os dados

-- Timeline events - descrição máximo 150 caracteres
ALTER TABLE timeline_events 
ADD CONSTRAINT description_length_check 
CHECK (LENGTH(description) <= 150);

-- Client timelines - nome do cliente máximo 150 caracteres
ALTER TABLE client_timelines 
ADD CONSTRAINT client_name_length_check 
CHECK (LENGTH(client_name) <= 150);

-- Tags - nome da tag máximo 150 caracteres
ALTER TABLE tags 
ADD CONSTRAINT tag_name_length_check 
CHECK (LENGTH(name) <= 150);

-- Organizations - nome da organização máximo 150 caracteres
ALTER TABLE organizations
ADD CONSTRAINT organization_name_length_check
CHECK (LENGTH(name) <= 150);

-- Profiles - nome completo máximo 150 caracteres
ALTER TABLE profiles
ADD CONSTRAINT full_name_length_check
CHECK (LENGTH(full_name) <= 150);