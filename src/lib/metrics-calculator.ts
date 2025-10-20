import { normalizeDisplayDate } from './date-utils';

export interface ClientMetrics {
  totalEvents: number;
  responseRate: number;
  noResponseRate: number;
  resolvedCount: number;
  noResponseCount: number;
  daysSinceStart: number;
  daysUntilDue: number | null;
  isOverdue: boolean;
  daysOverdue: number;
  avgEventsPerWeek: number;
  contactFrequency: number;
}

export interface Event {
  id: string;
  status: 'created' | 'resolved' | 'no_response';
  event_date: string;
  event_time?: string;
  description?: string;
}

export interface Client {
  id: string;
  client_name: string;
  client_id?: string;
  start_date: string;
  due_date?: string;
  boleto_value?: string;
  is_active: boolean;
}

export function calculateClientMetrics(
  client: Client,
  events: Event[]
): ClientMetrics {
  const now = new Date();
  const startDate = new Date(client.start_date);
  const dueDate = client.due_date ? new Date(client.due_date) : null;

  const totalEvents = events.length;
  const resolvedCount = events.filter(e => e.status === 'resolved').length;
  const noResponseCount = events.filter(e => e.status === 'no_response').length;

  const daysSinceStart = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysUntilDue = dueDate
    ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = dueDate ? now > dueDate : false;
  const daysOverdue = isOverdue && dueDate
    ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const responseRate = totalEvents > 0 ? (resolvedCount / totalEvents) * 100 : 0;
  const noResponseRate = totalEvents > 0 ? (noResponseCount / totalEvents) * 100 : 0;

  const avgEventsPerWeek = daysSinceStart > 0 ? (totalEvents / daysSinceStart) * 7 : 0;
  const contactFrequency = daysSinceStart > 0 ? totalEvents / daysSinceStart : 0;

  return {
    totalEvents,
    responseRate: Math.round(responseRate * 10) / 10,
    noResponseRate: Math.round(noResponseRate * 10) / 10,
    resolvedCount,
    noResponseCount,
    daysSinceStart,
    daysUntilDue,
    isOverdue,
    daysOverdue,
    avgEventsPerWeek: Math.round(avgEventsPerWeek * 10) / 10,
    contactFrequency: Math.round(contactFrequency * 100) / 100,
  };
}

export function formatCurrency(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue || 0);
}

export function formatDate(dateString: string): string {
  // Esta função agora usa a biblioteca centralizada
  return normalizeDisplayDate(dateString);
}

export function daysBetween(date1: Date, date2: Date): number {
  return Math.floor(
    Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)
  );
}