

## Plano: Progresso e Tempo Estimado da Sincronização

### Abordagem

A API do IXC já retorna um campo `total` na resposta (visível na linha 393: `testData.total`). Podemos usar isso para calcular a porcentagem e estimar o tempo restante.

### Mudanças

#### 1. Database: Adicionar coluna `total_records` na tabela `integration_sync_log`

```sql
ALTER TABLE public.integration_sync_log 
ADD COLUMN total_records integer DEFAULT 0;
```

#### 2. Edge Function (`supabase/functions/ixc-sync/index.ts`)

- Na primeira página de cada sync (`syncClients`, `syncBoletos`), capturar o `data.total` retornado pela API IXC
- Salvar `total_records` no log imediatamente
- Atualizar `records_processed` a cada página (100 registros) no log, para o frontend acompanhar o progresso em tempo real

Exemplo no loop:
```typescript
// Primeira página: salvar total
if (page === 1) {
  totalRecords = parseInt(data.total) || 0;
  await supabaseAdmin.from('integration_sync_log')
    .update({ total_records: totalRecords })
    .eq('id', logId);
}

// A cada página: atualizar progresso
await supabaseAdmin.from('integration_sync_log')
  .update({ records_processed: totalProcessed })
  .eq('id', logId);
```

#### 3. Frontend (`src/components/settings/IXCIntegration.tsx`)

- Adicionar `total_records` ao tipo `SyncLog`
- Mostrar barra de progresso (`Progress`) durante syncs com status `running`
- Calcular porcentagem: `(records_processed / total_records) * 100`
- Calcular tempo estimado: baseado na taxa de processamento (registros/segundo) desde `started_at`
- Reduzir intervalo de polling para 5s durante sync ativo
- Exibir: `"42% concluído — ~2min restantes"`

### Detalhes Técnicos

- O polling a cada 5s busca os logs `running` e atualiza a UI com a barra de progresso
- O cálculo de tempo usa: `tempoDecorrido * (totalRestante / totalProcessado)`
- A barra de progresso usa o componente `Progress` já existente no projeto

