

## Problemas Identificados

1. **Erro "Bad Request" no Calendário**: As queries usam `.in('timeline_id', timelineIds)` e `.in('line_id', lineIds)` com 1625+ IDs. O PostgREST tem limite de tamanho de URL para queries GET, e enviar centenas/milhares de IDs no filtro `.in()` excede esse limite.

2. **Limite de 1000 registros**: As queries de `client_timelines`, `timeline_lines` e `timeline_events` não implementam paginação, então no máximo 1000 registros são retornados de cada tabela.

3. **Lentidão geral**: Cada mudança em realtime dispara reload completo de TODOS os eventos. Três canais de realtime (events, timelines, lines) recarregam tudo a cada alteração.

## Solução

### 1. Paginação em lote para todas as queries (Calendar.tsx e CalendarWidget.tsx)

Criar uma função utilitária `fetchAllPaginated` que busca em lotes de 1000 com `.range()`. Aplicar a todas as queries de `client_timelines`, `timeline_lines` e `timeline_events`.

### 2. Dividir `.in()` em chunks para evitar Bad Request

Quando a lista de IDs é grande (ex: 1625 timeline_ids), dividir em chunks de 200 IDs e fazer múltiplas queries menores, concatenando os resultados. Isso resolve o "Bad Request" causado por URLs muito longas.

```typescript
// Exemplo da lógica de chunks
const chunkSize = 200;
const allResults = [];
for (let i = 0; i < ids.length; i += chunkSize) {
  const chunk = ids.slice(i, i + chunkSize);
  const { data } = await query.in('column', chunk);
  allResults.push(...(data || []));
}
```

### 3. Aplicar em ambos os arquivos

**`src/pages/Calendar.tsx`** (loadEvents ~linha 153-245):
- Paginar busca de `client_timelines` com `.range()`
- Dividir `timelineIds` em chunks de 200 para buscar `timeline_lines`
- Dividir `lineIds` em chunks de 200 para buscar `timeline_events`

**`src/components/CalendarWidget.tsx`** (loadEvents ~linha 97-155):
- Mesma lógica de paginação e chunks

### 4. Reduzir logs de debug excessivos

Remover os `console.log` detalhados dentro de `getEventsForDay` (chamado para cada dia do calendário = 30+ logs por renderização), que contribuem para lentidão.

### Detalhes Técnicos

Criar helper reutilizável em ambos os arquivos (ou extrair para um utilitário):

```typescript
async function fetchInChunks(table: string, column: string, ids: string[], select: string) {
  const chunkSize = 200;
  const allData: any[] = [];
  
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const { data } = await supabaseClient
        .from(table)
        .select(select)
        .in(column, chunk)
        .range(offset, offset + 999);
      
      if (data && data.length > 0) {
        allData.push(...data);
        offset += 1000;
        hasMore = data.length === 1000;
      } else {
        hasMore = false;
      }
    }
  }
  return allData;
}
```

Isso resolve tanto o "Bad Request" (chunks de 200 IDs) quanto o limite de 1000 rows (paginação com `.range()`).

