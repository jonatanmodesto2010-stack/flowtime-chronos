import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Timeline } from './Timeline';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  client_name: string;
  client_id?: string | null;
  start_date: string;
  due_date?: string | null;
  boleto_value?: string | null;
  is_active: boolean;
  organization_id?: string;
}

interface Event {
  id: string;
  icon: string;
  iconSize: string;
  date: string;
  description: string;
  position: 'top' | 'bottom';
  status: 'created' | 'resolved' | 'no_response';
  time?: string;
}

interface TimelineLine {
  id: string;
  events: Event[];
}

interface TimelineData {
  id: string;
  organization_id?: string;
  clientInfo: {
    clientId?: string;
    name: string;
    startDate: string;
    boletoValue: string;
    dueDate: string;
  };
  lines: TimelineLine[];
}

interface ClientTimelineDialogProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

export const ClientTimelineDialog = ({
  client,
  isOpen,
  onClose,
}: ClientTimelineDialogProps) => {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadTimelineData();
    }
  }, [isOpen, client.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const loadLastUpdatedBy = async () => {
    try {
      const { data, error } = await supabase
        .from('client_timelines')
        .select(`
          updated_at,
          user_id,
          profiles:user_id (
            full_name
          )
        `)
        .eq('id', client.id)
        .single();

      if (error) throw error;

      if (data) {
        setLastUpdatedAt(data.updated_at);
        setLastUpdatedBy((data.profiles as any)?.full_name || 'Usuário desconhecido');
      }
    } catch (error) {
      console.error('Erro ao carregar informações de auditoria:', error);
    }
  };

  const loadTimelineData = async () => {
    try {
      setLoading(true);

      // Carregar linhas da timeline
      const { data: lines, error: linesError } = await supabase
        .from('timeline_lines')
        .select('*')
        .eq('timeline_id', client.id)
        .order('position', { ascending: true });

      if (linesError) throw linesError;

      // Carregar eventos para cada linha
      const linesWithEvents = await Promise.all(
        (lines || []).map(async (line) => {
          const { data: events, error: eventsError } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('line_id', line.id)
            .order('event_order', { ascending: true });

          if (eventsError) throw eventsError;

          return {
            id: line.id,
            events: (events || []).map((e) => ({
              id: e.id,
              icon: e.icon,
              iconSize: e.icon_size,
              date: e.event_date,
              description: e.description || '',
              position: e.position as 'top' | 'bottom',
              status: e.status as 'created' | 'resolved' | 'no_response',
              time: e.event_time || undefined,
            })),
          };
        })
      );

      setTimelineData({
        id: client.id,
        organization_id: client.organization_id,
        clientInfo: {
          clientId: client.client_id || undefined,
          name: client.client_name,
          startDate: client.start_date,
          boletoValue: client.boleto_value || '',
          dueDate: client.due_date || client.start_date,
        },
        lines: linesWithEvents,
      });

      // Carregar informações de auditoria
      await loadLastUpdatedBy();
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar timeline',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border-2 border-green-500/50 rounded-xl shadow-2xl w-full h-[calc(100vh-50px)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-green-500/30 shrink-0">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
              {client.client_name}
            </h2>
            {lastUpdatedBy && lastUpdatedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                <span>
                  Última atualização: 
                  <span className="font-semibold text-foreground ml-1">{lastUpdatedBy}</span>
                  {' - '}
                  {new Date(lastUpdatedAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full shrink-0 hover:bg-red-500/20 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando timeline...</p>
              </div>
            </div>
          ) : timelineData ? (
            <div className="max-w-full">
      <Timeline
        timeline={timelineData}
        updateLine={async (lineId, events) => {
        try {
          // Deletar eventos antigos da linha
          await supabase
            .from('timeline_events')
            .delete()
            .eq('line_id', lineId);
          
          // Inserir novos eventos
          if (events.length > 0) {
            const eventsToInsert = events.map((event, index) => ({
              line_id: lineId,
              event_date: event.date,
              event_time: event.time || null,
              description: event.description,
              position: event.position,
              status: event.status,
              icon: event.icon,
              icon_size: event.iconSize,
              event_order: index,
            }));

            await supabase
              .from('timeline_events')
              .insert(eventsToInsert);
          }

          // Atualizar estado local ao invés de recarregar tudo
          setTimelineData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              lines: prev.lines.map(line => 
                line.id === lineId ? { ...line, events } : line
              )
            };
          });

          // Atualizar apenas a auditoria
          await loadLastUpdatedBy();
          
          // Toast apenas para eventos NOVOS ou EDITADOS (não para mudança de status)
          const hasNewEvent = events.some(e => e.isNew);
          const isEditing = events.length === 1;
          if (hasNewEvent || isEditing) {
            toast({
              title: 'Timeline atualizada',
              description: 'Os eventos foram salvos com sucesso.',
            });
          }
          } catch (error: any) {
            toast({
              title: 'Erro ao salvar',
              description: error.message,
              variant: 'destructive',
            });
          }
        }}
        updateClientInfo={async (updatedInfo) => {
          try {
            await supabase
              .from('client_timelines')
              .update({
                client_name: updatedInfo.name,
                start_date: updatedInfo.startDate,
                boleto_value: updatedInfo.boletoValue ? parseFloat(updatedInfo.boletoValue) : null,
                due_date: updatedInfo.dueDate || null,
              })
              .eq('id', client.id);

            await loadLastUpdatedBy();

            toast({
              title: 'Cliente atualizado',
              description: 'As informações foram atualizadas com sucesso.',
            });
          } catch (error: any) {
            toast({
              title: 'Erro ao atualizar',
              description: error.message,
              variant: 'destructive',
            });
          }
        }}
        onComplete={async (notes, createNew) => {
          try {
            // Obter user atual
            const { data: { user } } = await supabase.auth.getUser();
            
            // Atualizar timeline atual para completed
            await supabase
              .from('client_timelines')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                completion_notes: notes,
                is_active: false,
              })
              .eq('id', client.id);

            // Se criar nova timeline
            if (createNew) {
              await supabase
                .from('client_timelines')
                .insert({
                  client_name: client.client_name,
                  client_id: client.client_id,
                  organization_id: client.organization_id,
                  start_date: new Date().toISOString().split('T')[0],
                  status: 'active',
                  is_active: true,
                  user_id: user?.id,
                });
            }

            toast({
              title: 'Timeline finalizada',
              description: createNew 
                ? 'Uma nova timeline foi criada para este cliente.'
                : 'Timeline marcada como concluída.',
            });

            onClose(); // Fecha o modal e recarrega dados
          } catch (error: any) {
            toast({
              title: 'Erro ao finalizar',
              description: error.message,
              variant: 'destructive',
            });
          }
        }}
        readOnly={false}
      />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                Nenhuma timeline encontrada para este cliente.
              </p>
            </div>
          )}
        </div>

      </motion.div>
    </motion.div>
  );
};
