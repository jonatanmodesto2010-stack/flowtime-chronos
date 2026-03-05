

## Problema identificado

A query de "Bloqueados" filtra `is_active = false AND status != 'archived'`, o que retorna:
- **44 clientes** com `status = 'active'` (os verdadeiros bloqueados do IXC)
- **76 clientes** com `status = 'completed'` (timelines finalizadas que também têm `is_active = false`)

Total: 120 clientes aparecendo como "bloqueados", quando deveriam ser apenas 44.

## Solução

Alterar o filtro de "blocked" para buscar apenas clientes com `is_active = false AND status = 'active'`, excluindo os que têm status `completed` ou `archived`.

### Detalhes técnicos

**Arquivo: `src/pages/Clients.tsx`** (linha 178)

Atual:
```typescript
query = query.eq('is_active', false).neq('status', 'archived');
```

Corrigir para:
```typescript
query = query.eq('is_active', false).eq('status', 'active');
```

Isso garante que apenas os 44 clientes genuinamente bloqueados (contrato ativo mas acesso bloqueado) sejam listados.

Adicionalmente, na lógica de badge/estilo visual (mesma lógica), verificar que clientes com `is_active = false AND status = 'completed'` mostrem badge "FINALIZADO" e nao "BLOQUEADO". Ajustar a prioridade de exibição do badge para considerar `status === 'completed'` antes de `!is_active` quando ambos coincidem.

**Arquivo: `src/pages/Clients.tsx`** (renderização de badges, ~linha 580)

Reordenar a lógica:
1. `status === 'archived'` → INATIVO
2. `status === 'completed'` → FINALIZADO  
3. `!is_active` → BLOQUEADO
4. default → ATIVO

**Arquivo: `src/lib/client-utils.ts`** (groupTimelinesByClient)

Ajustar prioridade para que `completed` com `is_active=false` seja tratado como finalizado, não bloqueado:
1. `archived` → 0
2. `!is_active AND status != completed` → 1 (bloqueado real)
3. `status != completed` → 2 (ativo)
4. `completed` → 3 (finalizado)

**Arquivo: `src/lib/client-sort.ts`** (defaultClientSort)

Ajustar para que "bloqueado" = `!is_active AND status !== 'completed'`:
```typescript
const aBlocked = !a.is_active && a.status !== 'completed';
```

