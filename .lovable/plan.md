

## Plano: Corrigir busca de clientes para retornar todos os registros

### Problema
Os logs mostram que a API do IXC retorna apenas 690 clientes (página 1: 500, página 2: 190), mas deveria ter ~835. O problema está nos parâmetros de consulta: usar `oper: "="` com `query: ""` pode estar filtrando registros em algumas versões do IXC.

### Solução
Alterar a função `fetchIxcData` para usar `oper: ">"` com `query: "0"` quando o endpoint for `cliente`, garantindo que todos os registros sejam retornados. Também adicionar log do `data.total` reportado pela API para diagnóstico.

### Detalhes técnicos

**Arquivo: `supabase/functions/ixc-sync/index.ts`**

1. Modificar `fetchIxcData` para aceitar parâmetros de query opcionais (oper/query), com defaults que retornem todos os registros:
   - `oper: ">"` e `query: "0"` como default (busca todos os registros com id > 0)
   
2. Adicionar log explícito do `data.total` na primeira página de clientes para validar quantos registros a API reporta.

3. Manter compatibilidade com os outros endpoints (`cliente_contrato`, `cliente_bloqueado`, `fn_areceber`).

