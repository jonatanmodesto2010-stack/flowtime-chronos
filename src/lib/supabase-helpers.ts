import { supabase } from '@/integrations/supabase/client';

/**
 * Busca todos os registros de uma tabela paginando com .range() para superar o limite de 1000 rows.
 */
export async function fetchAllPaginated(
  table: string,
  select: string,
  filters?: { column: string; value: any; op?: 'eq' | 'neq' }[]
): Promise<any[]> {
  const batchSize = 1000;
  const allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = (supabase as any).from(table).select(select);
    if (filters) {
      for (const f of filters) {
        const op = f.op || 'eq';
        query = query[op](f.column, f.value);
      }
    }
    const { data, error } = await query.range(offset, offset + batchSize - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      allData.push(...data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

/**
 * Busca registros usando .in() dividindo em chunks de 200 IDs para evitar Bad Request,
 * e paginando cada chunk com .range() para superar o limite de 1000 rows.
 */
export async function fetchInChunks(
  table: string,
  column: string,
  ids: string[],
  select: string
): Promise<any[]> {
  if (ids.length === 0) return [];

  const chunkSize = 200;
  const batchSize = 1000;
  const allData: any[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await (supabase as any)
        .from(table)
        .select(select)
        .in(column, chunk)
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (data && data.length > 0) {
        allData.push(...data);
        offset += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
  }
  return allData;
}
