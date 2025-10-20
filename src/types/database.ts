// Tipos temporários até a regeneração automática dos tipos do Supabase
export interface DatabaseClientTimeline {
  id: string;
  user_id: string;
  client_name: string;
  start_date: string;
  boleto_value: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTimelineLine {
  id: string;
  timeline_id: string;
  position: number;
  created_at: string;
}

export interface DatabaseTimelineEvent {
  id: string;
  line_id: string;
  event_date: string;
  description: string | null;
  position: 'top' | 'bottom';
  status: 'created' | 'resolved' | 'no_response';
  icon: string;
  icon_size: string;
  event_order: number;
  created_at: string;
  updated_at: string;
}
