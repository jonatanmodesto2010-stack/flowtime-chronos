

## Plano: Integração com IXC Provedor

### Resumo

Criar uma integração completa com o sistema IXC Provedor para sincronizar clientes e boletos/faturas automaticamente com o sistema de cobrança.

### Como funciona a API do IXC

A API do IXC usa autenticação via **Basic Auth** com token base64. Os endpoints principais são:
- `POST /webservice/v1/cliente` - listar/buscar clientes
- `POST /webservice/v1/fn_areceber` - listar faturas/boletos (contas a receber)

A API usa POST com parâmetros de busca no body para listar registros.

### Etapas de implementação

**1. Armazenar credenciais IXC como secrets**
- `IXC_API_URL` - URL do servidor IXC (ex: `https://seudominio.ixcsoft.com.br`)
- `IXC_API_TOKEN` - Token de acesso da API (formato Base64)

**2. Criar Edge Function `ixc-sync`**
- Endpoint para sincronizar clientes do IXC com a tabela `client_timelines`
- Endpoint para sincronizar faturas/boletos do IXC com a tabela `client_boletos`
- Mapeamento de campos:
  - IXC `razao` → `client_name`
  - IXC `id` → `client_id`
  - IXC `ativo` → `is_active`
  - IXC faturas `valor` → `boleto_value`
  - IXC faturas `data_vencimento` → `due_date`
  - IXC faturas `status` → `status` (mapeando para pendente/pago/atrasado/cancelado)

**3. Adicionar aba "Integrações" nas Configurações**
- Nova aba na página Settings com formulário para:
  - Indicar status da conexão com IXC
  - Botão "Sincronizar Clientes" e "Sincronizar Boletos"
  - Log de última sincronização
  - Opção de sincronização automática

**4. Criar tabela de controle de sincronização**
- Tabela `integration_sync_log` para registrar quando cada sincronização foi executada e quantos registros foram processados

### Detalhes técnicos

- A Edge Function usará `SUPABASE_SERVICE_ROLE_KEY` para inserir/atualizar dados
- Upsert baseado no `client_id` (ID do IXC) para evitar duplicatas
- Paginação na API do IXC (registros por página) para importar todos os dados
- Tratamento de erros e rate limiting

