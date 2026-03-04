

## Diagnóstico

O problema de performance é claro: **cada registro é processado individualmente com 2-3 queries sequenciais** ao banco de dados:

1. `SELECT` para verificar se o cliente já existe
2. `INSERT` ou `UPDATE` dependendo do resultado
3. `checkCancelled` a cada 10 registros (mais 1 query)

Para 690 clientes, isso são **~1400+ queries sequenciais**, o que explica a lentidão extrema (~1 minuto por página de 100 registros).

## Solução: Processamento em lote (batch/bulk)

Substituir o processamento individual por operações em lote usando `upsert` do Supabase.

### Edge Function (`supabase/functions/ixc-sync/index.ts`)

#### `syncClients` — Refatorar para batch upsert:
- Coletar todos os `client_id`s da página
- Fazer **1 query** para buscar todos os existentes de uma vez
- Separar em listas de criação e atualização
- Usar `upsert` com a página inteira em **1 operação**
- Resultado: de ~200 queries por página para ~3 queries por página

```typescript
// ANTES (por registro):
for (record of records) {
  SELECT existing WHERE client_id = X  // 1 query
  INSERT or UPDATE                      // 1 query
}
// = 200 queries por página de 100

// DEPOIS (por lote):
SELECT all existing WHERE client_id IN (...)  // 1 query
UPSERT batch of records                       // 1 query
UPDATE progress                               // 1 query
// = 3 queries por página de 100
```

#### `syncBoletos` — Mesma refatoração:
- Buscar todos os timelines dos clientes da página em 1 query
- Buscar todos os boletos existentes em 1 query
- Upsert em lote

#### Reduzir frequência de `checkCancelled`:
- Verificar apenas 1x por página (a cada 100 registros) em vez de a cada 10, já que cada página agora será processada em segundos

### Resultado esperado
- **Antes**: ~60s por página de 100 registros → ~7 min para 690 clientes
- **Depois**: ~2-3s por página → ~15-20s para 690 clientes

