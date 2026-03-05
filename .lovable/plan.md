

## Plano: Paginação com navegação e 30 clientes por página

### O que será feito

Adicionar controles de paginação no formato do primeiro print (botões de navegação: primeiro, anterior, atualizar, próximo, último + indicador "1 - 30 / 1770") com 30 clientes por página.

### Detalhes técnicos

**Arquivo: `src/pages/Clients.tsx`**

1. **Novos estados de paginação**:
   - `currentPage` (default: 1)
   - `itemsPerPage` (30)
   - Derivar `totalPages`, `startIndex`, `endIndex`, `paginatedClients`

2. **Substituir renderização de `filteredClients`** pelo slice paginado (`paginatedClients`), mantendo animações apenas nos 30 itens visíveis (melhora performance).

3. **Substituir o texto "44 de 1770"** por uma barra de paginação no estilo do print:
   ```
   |◄  ◄◄  🔄  ►►  ►|   1 - 30 / 1770
   ```
   Botões: primeiro (`ChevronFirst`), anterior (`ChevronLeft`), atualizar (`RefreshCw`), próximo (`ChevronRight`), último (`ChevronLast`) + texto "1 - 30 / 1770".

4. **Reset da página** para 1 sempre que `filteredClients` mudar (novo filtro aplicado).

5. **Remover delay de animação** por index (`delay: index * 0.05`) que causa lentidão com muitos itens — usar delay fixo ou nenhum.

