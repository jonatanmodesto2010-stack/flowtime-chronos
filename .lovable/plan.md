

## Plano: Adicionar campo de URL da API de Contratos na integração IXC

### O que muda

1. **Banco de dados** - Adicionar coluna `api_url_contracts` (text, nullable) na tabela `organization_integrations` para armazenar a URL da API de contratos separadamente.

2. **UI (`src/components/settings/IXCIntegration.tsx`)** - Adicionar um novo campo de input "URL da API de Contratos" abaixo do campo de URL principal, com placeholder e descrição explicativa. O valor será salvo/carregado junto com as demais configurações.

3. **Edge Function (`supabase/functions/ixc-sync/index.ts`)** - A função `fetchBlockedClientIds` passará a usar a URL de contratos (quando configurada) para buscar dados do endpoint `cliente_contrato`, ao invés de usar a URL base.

### Detalhes técnicos

- Migration SQL: `ALTER TABLE organization_integrations ADD COLUMN api_url_contracts text;`
- Novo state `apiUrlContracts` no componente
- Salvar/carregar o campo no `fetchConfig` e `handleSaveConfig`
- Na edge function, ler `api_url_contracts` da config e usar como base para chamadas ao endpoint de contratos

