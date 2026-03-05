

## Plano: Reordenar lista de clientes com nova hierarquia

### Nova ordem
1. **Bloqueados** (vermelho) — `!is_active && status !== 'archived'`
2. **Vencidos** (amarelo) — `is_active && overdueDaysMap.has(id)` e não finalizado/arquivado
3. **Ativos** (verde) — `is_active && !overdueDaysMap.has(id)` e não finalizado/arquivado
4. **Inativos** (cinza) — `status === 'archived'` ou `status === 'completed'`

### Mudanças técnicas

**`src/pages/Clients.tsx`** — Substituir as chamadas a `defaultClientSort` por uma função de ordenação local que tenha acesso ao `overdueDaysMap`:

```typescript
const sortWithOverdue = (a, b) => {
  const getGroup = (c) => {
    if (c.status === 'archived' || c.status === 'completed') return 3; // Inativo
    if (!c.is_active) return 0; // Bloqueado
    if (overdueDaysMap.has(c.id)) return 1; // Vencido
    return 2; // Ativo
  };
  const diff = getGroup(a) - getGroup(b);
  if (diff !== 0) return diff;
  // Dentro do mesmo grupo: updated_at DESC
  return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
};
```

Aplicar esse sort nos dois pontos onde `defaultClientSort` é usado (linha ~155 e ~384), mas apenas quando `overdueDaysMap` já estiver populado. No `loadClients`, mover o sort para depois do cálculo do `overdueDaysMap`.

