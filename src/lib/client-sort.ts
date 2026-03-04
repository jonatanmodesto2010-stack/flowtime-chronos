/**
 * Função de ordenação padrão para clientes/timelines:
 * 1. Finalizados (completed/archived) → sempre por último
 * 2. Bloqueados (is_active === false) → topo, ordenados por due_date ASC (mais atrasado primeiro)
 * 3. Ativos → meio, ordenados por updated_at DESC (mais recente primeiro)
 */
export const defaultClientSort = <T extends {
  status: string;
  is_active: boolean;
  due_date?: string | null;
  updated_at?: string | null;
  created_at: string | null;
}>(a: T, b: T): number => {
  const aCompleted = a.status === 'completed' || a.status === 'archived';
  const bCompleted = b.status === 'completed' || b.status === 'archived';

  // Finalizados vão para o final
  if (aCompleted !== bCompleted) {
    return aCompleted ? 1 : -1;
  }

  // Se ambos finalizados, ordenar por updated_at DESC
  if (aCompleted && bCompleted) {
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return dateB - dateA;
  }

  // Bloqueados (is_active === false) vêm antes dos ativos
  if (a.is_active !== b.is_active) {
    return a.is_active ? 1 : -1;
  }

  // Se ambos bloqueados, ordenar por due_date ASC (mais atrasado/antigo primeiro, null por último)
  if (!a.is_active && !b.is_active) {
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    // Ambos sem due_date, ordenar por updated_at DESC
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return dateB - dateA;
  }

  // Ambos ativos, ordenar por updated_at DESC (mais recente primeiro)
  const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
  const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
  return dateB - dateA;
};
