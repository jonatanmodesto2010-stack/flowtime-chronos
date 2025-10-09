-- Garantir que as tabelas são acessíveis via API
-- Conceder permissões SELECT para o role anon e authenticated

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Garantir permissões para sequences (para IDs auto-gerados)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Garantir permissões para funções
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Definir permissões padrão para novas tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;