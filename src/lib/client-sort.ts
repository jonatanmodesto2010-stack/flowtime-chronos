/**
 * Função de ordenação padrão para clientes/timelines:
 * 1. Bloqueados (is_active === false, status !== archived) → topo, ordenados por due_date ASC
 * 2. Ativos (is_active === true, status !== completed/archived) → meio, ordenados por updated_at DESC
 * 3. Finalizados (status === completed) → após ativos
 * 4. Inativos (status === archived) → último
 */
export const defaultClientSort = <T extends {
  status: string;
  is_active: boolean;
  due_date?: string | null;
  updated_at?: string | null;
  created_at: string | null;
}>(a: T, b: T): number => {
  const aArchived = a.status === 'archived';
  const bArchived = b.status === 'archived';

  // Inativos (archived) sempre por último
  if (aArchived !== bArchived) {
    return aArchived ? 1 : -1;
  }

  const aBlocked = !a.is_active && a.status !== 'completed' && a.status !== 'archived';
  const bBlocked = !b.is_active && b.status !== 'completed' && b.status !== 'archived';

  // Bloqueados (is_active === false) no topo (exceto archived)
  if (aBlocked !== bBlocked) {
    return aBlocked ? -1 : 1;
  }

  // Se ambos bloqueados, ordenar por due_date ASC
  if (aBlocked && bBlocked) {
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return dateB - dateA;
  }

  // Finalizados (completed) após ativos
  const aCompleted = a.status === 'completed';
  const bCompleted = b.status === 'completed';
  if (aCompleted !== bCompleted) {
    return aCompleted ? 1 : -1;
  }

  // Mesmo grupo: ordenar por updated_at DESC
  const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
  const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
  return dateB - dateA;
};
