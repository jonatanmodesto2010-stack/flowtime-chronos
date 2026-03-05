

## Plano: Destacar em amarelo clientes com faturas em atraso mas não bloqueados

### O que será feito
Na linha 651, onde as classes CSS do card são definidas, adicionar uma condição: se o cliente é **ativo** (`is_active === true`), **não está finalizado/arquivado**, e **tem dias em atraso** no `overdueDaysMap`, o card terá fundo amarelo ao invés do fundo padrão.

### Mudança técnica
No `src/pages/Clients.tsx`, linha 651, alterar a lógica de classes CSS:

- Condição atual para cliente ativo: `'bg-card hover:bg-card/80'`
- Nova condição: se `client.is_active && overdueDaysMap.has(client.id)` → `'bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30'`
- Caso contrário, mantém `'bg-card hover:bg-card/80'`

A ordem de prioridade das cores ficará:
1. Archived (cinza) 
2. Finalizado (cinza + grayscale)
3. Bloqueado / `!is_active` (vermelho)
4. Ativo com atraso (amarelo) ← **novo**
5. Ativo normal (padrão)

