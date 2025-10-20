import { supabase as originalSupabase } from '@/integrations/supabase/client';

// Wrapper temporário até os tipos serem regenerados
export const supabaseClient = {
  auth: originalSupabase.auth,
  
  from: (table: string) => {
    const tableQuery = (originalSupabase as any).from(table);
    
    return {
      select: (...args: any[]) => tableQuery.select(...args),
      insert: (data: any) => tableQuery.insert(data),
      update: (data: any) => tableQuery.update(data),
      delete: () => tableQuery.delete(),
      eq: (column: string, value: any) => tableQuery.eq(column, value),
      order: (column: string, options?: any) => tableQuery.order(column, options),
      single: () => tableQuery.single(),
    };
  }
};
