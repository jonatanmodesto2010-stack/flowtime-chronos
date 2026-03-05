

## Plano: Corrigir filtro de clientes bloqueados

### Mudança

Em `src/pages/Clients.tsx`, linha 234, alterar:

```typescript
// De:
query = query.eq('is_active', false).eq('status', 'active');

// Para:
query = query.eq('is_active', false).neq('status', 'archived').neq('status', 'completed');
```

Isso faz com que clientes bloqueados (`is_active = false`) sejam listados independente do status, exceto `archived` e `completed`. Nenhuma outra parte do código precisa ser alterada -- o `groupTimelinesByClient` e a paginação continuam funcionando normalmente.

