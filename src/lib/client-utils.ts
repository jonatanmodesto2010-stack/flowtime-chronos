export interface TimelineRecord {
  id: string;
  client_id: string;
  client_name: string;
  is_active: boolean;
  status: string;
  updated_at?: string;
  created_at: string;
  [key: string]: any;
}

/**
 * Agrupa timelines por client_id, mantendo apenas uma timeline por cliente.
 * Prioridade: bloqueados (is_active=false) > ativos > finalizados (completed)
 * Dentro do mesmo grupo, a mais recente vence.
 */
export const groupTimelinesByClient = <T extends TimelineRecord>(
  timelines: T[]
): T[] => {
  const clientsMap = new Map<string, T>();
  
  const getPriority = (t: T): number => {
    if (!t.is_active) return 0; // bloqueado = maior prioridade
    if (t.status !== 'completed') return 1; // ativo
    return 2; // finalizado
  };

  timelines.forEach(timeline => {
    const clientId = timeline.client_id;
    
    if (!clientsMap.has(clientId)) {
      clientsMap.set(clientId, timeline);
    } else {
      const existing = clientsMap.get(clientId)!;
      const existingPriority = getPriority(existing);
      const currentPriority = getPriority(timeline);
      
      if (currentPriority < existingPriority) {
        // Maior prioridade (bloqueado > ativo > finalizado)
        clientsMap.set(clientId, timeline);
      } else if (currentPriority === existingPriority) {
        // Mesmo grupo: mais recente vence
        const existingDate = new Date(existing.updated_at || existing.created_at);
        const currentDate = new Date(timeline.updated_at || timeline.created_at);
        if (currentDate > existingDate) {
          clientsMap.set(clientId, timeline);
        }
      }
    }
  });
  
  return Array.from(clientsMap.values());
};
