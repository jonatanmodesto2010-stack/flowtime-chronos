

## Plan: Clientes Bloqueados no Topo com Vencimentos Mais Atrasados Primeiro

### Entendimento
Clientes com `is_active === false` (bloqueados/inativos) devem aparecer **no topo** da lista, ordenados pelo `due_date` mais atrasado primeiro. Clientes ativos ficam abaixo, mantendo a ordenação atual.

### Mudança

**Arquivo: `src/pages/Clients.tsx`**

Alterar a lógica de ordenação em dois locais:

1. **`loadClients`** (linhas 135-149) - ordenação padrão após carregar
2. **`handleFilterChange`** - ordenação padrão no `else` final (linhas 331-345)

Nova lógica de ordenação (ambos os locais):

```
1. Finalizados (completed/archived) → sempre por último
2. Bloqueados (is_active === false) → topo, ordenados por due_date ASC (mais atrasado primeiro, null por último)
3. Ativos → meio, ordenados por updated_at DESC (mais recente primeiro)
```

### Detalhes Técnicos

A função de sort será:
- Se um é finalizado e outro não → finalizado vai para baixo
- Se um é bloqueado e outro é ativo → bloqueado vai para cima
- Se ambos bloqueados → ordenar por `due_date` ASC (mais antigo/atrasado primeiro, sem due_date por último)
- Se ambos ativos → ordenar por `updated_at` DESC

