import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive, Eye, Calendar } from 'lucide-react';
import { Timeline } from '@/components/Timeline';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { normalizeDisplayDate } from '@/lib/date-utils';

interface Event {
  id: string;
  icon: string;
  iconSize: string;
  date: string;
  description: string;
  position: 'top' | 'bottom';
  status: 'created' | 'resolved' | 'no_response';
  isNew?: boolean;
}

interface ClientInfo {
  clientId?: string;
  name: string;
  startDate: string;
  boletoValue: string;
  dueDate: string;
}

interface TimelineLine {
  id: string;
  events: Event[];
}

interface TimelineData {
  id: string;
  organization_id?: string;
  clientInfo: ClientInfo;
  lines: TimelineLine[];
  completed_at?: string;
  completion_notes?: string;
  status: string;
}

export const HistorySettings = () => {
  const [timelines, setTimelines] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineData | null>(null);
  const { organizationId } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    if (organizationId) {
      loadCompletedTimelines();
    }
  }, [organizationId]);

  const loadCompletedTimelines = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const { data: clientTimelines, error } = await supabaseClient
        .from('client_timelines')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['completed', 'archived'])
        .order('completed_at', { ascending: false });

      if (error) throw error;

      if (clientTimelines && clientTimelines.length > 0) {
        const timelinesWithLines = await Promise.all(
          clientTimelines.map(async (ct: any) => {
            const { data: lines, error: linesError } = await supabaseClient
              .from('timeline_lines')
              .select('*')
              .eq('timeline_id', ct.id)
              .order('position', { ascending: true });

            if (linesError) throw linesError;

            const linesWithEvents = await Promise.all(
              (lines || []).map(async (line: any) => {
                const { data: events, error: eventsError } = await supabaseClient
                  .from('timeline_events')
                  .select('*')
                  .eq('line_id', line.id)
                  .order('event_order', { ascending: true });

                if (eventsError) throw eventsError;

                return {
                  id: line.id,
                  events: (events || []).map((e: any) => ({
                    id: e.id,
                    icon: e.icon,
                    iconSize: e.icon_size,
                    date: e.event_date,
                    description: e.description || '',
                    position: e.position as 'top' | 'bottom',
                    status: e.status as 'created' | 'resolved' | 'no_response',
                  })),
                };
              })
            );

            return {
              id: ct.id,
              organization_id: ct.organization_id,
              clientInfo: {
                clientId: ct.client_id || undefined,
                name: ct.client_name,
                startDate: ct.start_date,
                boletoValue: ct.boleto_value ? ct.boleto_value.toString() : '',
                dueDate: ct.due_date || ct.start_date,
              },
              lines: linesWithEvents,
              completed_at: ct.completed_at,
              completion_notes: ct.completion_notes,
              status: ct.status,
            };
          })
        );

        setTimelines(timelinesWithLines);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (timelines.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Archive className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">Nenhuma timeline finalizada</p>
        <p className="text-sm">As cobranças finalizadas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Archive className="w-8 h-8 text-orange-500" />
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Histórico de Cobranças
          </h3>
          <p className="text-sm text-muted-foreground">
            Timelines finalizadas e arquivadas
          </p>
        </div>
      </div>

      {timelines.map((timeline) => (
        <motion.div
          key={timeline.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border overflow-hidden"
        >
          <div className="p-4 bg-card flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-4">
              <div>
                <h4 className="font-bold text-lg">
                  {timeline.clientInfo.clientId 
                    ? `${timeline.clientInfo.clientId} - ${timeline.clientInfo.name}`
                    : timeline.clientInfo.name
                  }
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  Finalizada em: {timeline.completed_at 
                    ? new Date(timeline.completed_at).toLocaleDateString('pt-BR')
                    : 'N/A'
                  }
                </div>
              </div>
              <Badge 
                variant="outline"
                className={
                  timeline.status === 'completed'
                    ? 'bg-green-500/20 text-green-500 border-green-500/50'
                    : 'bg-gray-500/20 text-gray-500 border-gray-500/50'
                }
              >
                {timeline.status === 'completed' ? '✅ Concluída' : '📦 Arquivada'}
              </Badge>
            </div>
            
            <button
              onClick={() => setSelectedTimeline(
                selectedTimeline?.id === timeline.id ? null : timeline
              )}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>

          {selectedTimeline?.id === timeline.id && (
            <div className="p-4">
              <Timeline
                timeline={timeline}
                updateLine={() => {}}
                updateClientInfo={() => {}}
                readOnly={true}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
