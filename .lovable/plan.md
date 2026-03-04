

## Diagnóstico

Encontrei a causa raiz nos logs da edge function:

```
Batch insert error: new row for relation "client_timelines" violates check constraint "client_timelines_status_check"
```

A tabela `client_timelines` tem uma check constraint que só permite os valores: `'active'`, `'completed'`, `'archived'`. Porém, o sync está setando `status: 'inactive'` para clientes com `ativo !== 'S'`, o que viola a constraint. Como o insert é em batch (100 por página), **uma única linha inválida faz toda a página falhar**, perdendo todos os clientes daquela página.

Resultado atual no banco: **169 active + 78 completed = 247** (exatamente o número que aparece).

## Solução

**Arquivo:** `supabase/functions/ixc-sync/index.ts`

Alterar o mapeamento de status para usar apenas valores permitidos pela constraint:
- `ativo === 'S'` → `'active'`
- `ativo !== 'S'` → `'archived'` (em vez de `'inactive'`)

Isso se aplica em dois pontos no `syncClients`: na criação de novos registros (linha ~179) e na atualização de existentes (linha ~169).

Após essa correção, re-sincronizar vai importar os ~500+ clientes que estavam falhando.

