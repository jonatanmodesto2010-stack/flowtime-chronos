

## Diagnóstico

O gargalo está nas **atualizações individuais** dos boletos. Nos logs vejo páginas com 100 updates sequenciais (ex: páginas 1-3 com 100 updates cada). Cada update é uma query separada e sequencial (linhas 336-346 e 189-199), o que é muito lento.

A inserção de novos registros já é batch (1 query), mas os updates são 1 query por registro.

## Solução: Updates em paralelo

**Arquivo:** `supabase/functions/ixc-sync/index.ts`

Substituir os loops sequenciais de update por `Promise.all` com concorrência limitada (10 updates simultâneos) tanto em `syncClients` quanto em `syncBoletos`.

```typescript
// ANTES (sequencial): ~100 queries uma a uma
for (const record of toUpdateList) {
  await supabaseAdmin.from('client_boletos').update({...}).eq('id', record.id);
}

// DEPOIS (paralelo com concorrência 10):
const CONCURRENCY = 10;
for (let i = 0; i < toUpdateList.length; i += CONCURRENCY) {
  const batch = toUpdateList.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(record =>
    supabaseAdmin.from('client_boletos').update({...}).eq('id', record.id)
  ));
}
```

Isso se aplica em dois pontos:
1. **`syncClients`** (linhas 189-199) — updates de clientes existentes
2. **`syncBoletos`** (linhas 336-346) — updates de boletos existentes

Resultado esperado: uma página com 100 updates passa de ~100 queries sequenciais para ~10 rodadas de 10 em paralelo, reduzindo o tempo em ~10x.

