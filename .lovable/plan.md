

## Plano: Garantir bloqueados sempre no topo, mesmo com filtros de ordenação

### Problema
A função `defaultClientSort` já coloca bloqueados primeiro, mas quando o usuário aplica filtros de ordenação (por quantidade de eventos ou data de atualização), a ordenação padrão é completamente substituída (linhas 300-318 de `Clients.tsx`), fazendo com que os bloqueados percam a prioridade.

### Solução
Modificar as ordenações alternativas em `Clients.tsx` para sempre manter bloqueados (`is_active === false`) no topo, independente do critério de ordenação selecionado.

### Detalhes técnicos

**Arquivo: `src/pages/Clients.tsx`** (linhas 299-318)

Nas duas ordenações alternativas (por event count e por update date), adicionar a mesma lógica de prioridade:

```typescript
results.sort((a, b) => {
  // Bloqueados SEMPRE no topo
  if (!a.is_active !== !b.is_active) return !a.is_active ? -1 : 1;
  
  // Dentro do mesmo grupo, aplicar ordenação específica
  // ... (lógica existente de event count ou update date)
});
```

Isso garante que, qualquer que seja o filtro ativo, clientes bloqueados apareçam primeiro.

