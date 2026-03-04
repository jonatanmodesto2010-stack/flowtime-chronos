/**
 * Função de ordenação padrão para clientes/timelines:
 * 1. Bloqueados (is_active === false) → topo, ordenados por due_date ASC (mais atrasado primeiro)
 * 2. Ativos (is_active === true, status !== completed) → meio, ordenados por updated_at DESC
 * 3. Finalizados (status === completed, is_active === true) → final
 */
export const defaultClientSort = <T extends {
  status: string;
  is_active: boolean;
  due_date?: string | null;
  updated_at?: string | null;
  created_at: string | null;
}>(a: T, b: T): number => {
  const aBlocked = !a.is_active;
  const bBlocked = !b.is_active;

  // Bloqueados (is_active === false) sempre no topo
  if (aBlocked !== bBlocked) {
    return aBlocked ? -1 : 1;
  }

  // Se ambos bloqueados, ordenar por due_date ASC (mais atrasado/antigo primeiro, null por último)
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

  // Entre os ativos: finalizados (completed) vão para o final
  const aCompleted = a.status === 'completed';
  const bCompleted = b.status === 'completed';
  if (aCompleted !== bCompleted) {
    return aCompleted ? 1 : -1;
  }

  // Ambos no mesmo grupo, ordenar por updated_at DESC (mais recente primeiro)
  const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
  const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
  return dateB - dateA;
};
