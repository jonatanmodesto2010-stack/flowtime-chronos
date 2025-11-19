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
 * Agrupa timelines por client_id, mantendo apenas a timeline mais recente de cada cliente
 * Prioriza timelines ativas sobre inativas quando há empate em datas
 */
export const groupTimelinesByClient = <T extends TimelineRecord>(
  timelines: T[]
): T[] => {
  const clientsMap = new Map<string, T>();
  
  timelines.forEach(timeline => {
    const clientId = timeline.client_id;
    
    if (!clientsMap.has(clientId)) {
      clientsMap.set(clientId, timeline);
    } else {
      const existing = clientsMap.get(clientId)!;
      const existingDate = new Date(existing.updated_at || existing.created_at);
      const currentDate = new Date(timeline.updated_at || timeline.created_at);
      
      // Priorizar timeline ativa mais recente
      if (timeline.is_active && !existing.is_active) {
        clientsMap.set(clientId, timeline);
      } else if (timeline.is_active === existing.is_active && currentDate > existingDate) {
        clientsMap.set(clientId, timeline);
      }
    }
  });
  
  return Array.from(clientsMap.values());
};
