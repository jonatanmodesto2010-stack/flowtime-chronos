import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Minus } from 'lucide-react';
import { EventModal } from './EventModal';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  icon: string;
  iconSize: string;
  date: string;
  description: string;
  position: 'top' | 'bottom';
  status: 'created' | 'resolved' | 'no_response';
  isNew?: boolean;
  time?: string;
  created_at?: string;
}

interface TimelineLine {
  id: string;
  events: Event[];
}

interface ClientTimelineProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export const ClientTimeline = ({ clientId, clientName, onClose }: ClientTimelineProps) => {
  const [lines, setLines] = useState<TimelineLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [isLocalUpdate, setIsLocalUpdate] = useState(false);
  const reloadTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    loadTimeline();
    
    // Realtime subscription para sincronização entre usuários
    const channel = supabase
      .channel('timeline_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events'
        },
        (payload) => {
          if (isLocalUpdate) return;
          
          console.log('Evento alterado:', payload);
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
          }
          reloadTimeoutRef.current = setTimeout(() => {
            loadTimeline();
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_lines',
          filter: `timeline_id=eq.${clientId}`
        },
        (payload) => {
          if (isLocalUpdate) return;
          
          console.log('Linha alterada:', payload);
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
          }
          reloadTimeoutRef.current = setTimeout(() => {
            loadTimeline();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      
      const { data: linesData, error: linesError } = await supabaseClient
        .from('timeline_lines')
        .select('*')
        .eq('timeline_id', clientId)
        .order('position', { ascending: true });

      if (linesError) throw linesError;

      if (linesData && linesData.length > 0) {
        const linesWithEvents = await Promise.all(
          linesData.map(async (line: any) => {
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
                time: e.event_time || undefined,
                description: e.description || '',
                position: e.position as 'top' | 'bottom',
                status: e.status as 'created' | 'resolved' | 'no_response',
                created_at: e.created_at
              })),
            };
          })
        );

        setLines(linesWithEvents);
      }
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

  const handleAddLine = async () => {
    try {
      const maxPosition = Math.max(...lines.map(l => l.events.length), -1);

      const { data: newLine, error } = await supabaseClient
        .from('timeline_lines')
        .insert({
          timeline_id: clientId,
          position: lines.length,
        })
        .select()
        .single();

      if (error) throw error;

      setLines([...lines, { id: newLine.id, events: [] }]);
      
      toast({
        title: 'Linha adicionada',
        description: 'Nova linha criada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar linha',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddEvent = (lineId: string) => {
    const newEvent: Event = {
      id: `temp-${Date.now()}`,
      icon: '💬',
      iconSize: 'text-2xl',
      date: '--/--',
      description: '',
      position: 'top',
      status: 'created',
      isNew: true,
    };

    setEditingEvent(newEvent);
    setEditingLineId(lineId);
  };

  const handleSaveEvent = async (event: Event) => {
    if (!editingLineId) return;

    const lineIndex = lines.findIndex(l => l.id === editingLineId);
    if (lineIndex === -1) return;

    const updatedLines = [...lines];
    const currentLine = updatedLines[lineIndex];

    if (event.isNew) {
      currentLine.events.unshift({ ...event, isNew: false });
    } else {
      const eventIndex = currentLine.events.findIndex(e => e.id === event.id);
      if (eventIndex !== -1) {
        currentLine.events[eventIndex] = event;
      }
    }

    setLines(updatedLines);
    await saveLineToDatabase(editingLineId, currentLine.events);
    setEditingEvent(null);
    setEditingLineId(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!editingLineId) return;

    const lineIndex = lines.findIndex(l => l.id === editingLineId);
    if (lineIndex === -1) return;

    const updatedLines = [...lines];
    const currentLine = updatedLines[lineIndex];
    currentLine.events = currentLine.events.filter(e => e.id !== eventId);

    setLines(updatedLines);
    await saveLineToDatabase(editingLineId, currentLine.events);
    setEditingEvent(null);
    setEditingLineId(null);
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta linha?')) return;

    try {
      const { error } = await supabaseClient
        .from('timeline_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;

      setLines(lines.filter(l => l.id !== lineId));
      
      toast({
        title: 'Linha excluída',
        description: 'Linha removida com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir linha',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusToggle = async (lineId: string, eventId: string) => {
    const lineIndex = lines.findIndex(l => l.id === lineId);
    if (lineIndex === -1) return;

    const updatedLines = [...lines];
    const currentLine = updatedLines[lineIndex];
    const event = currentLine.events.find(e => e.id === eventId);
    
    if (!event) return;

    const statusFlow = { created: 'resolved', resolved: 'no_response', no_response: 'created' };
    event.status = statusFlow[event.status] as 'created' | 'resolved' | 'no_response';
    event.position = event.status === 'resolved' ? 'bottom' : event.position;

    setLines(updatedLines);
    await saveLineToDatabase(lineId, currentLine.events);
  };

  const handleEventClick = (event: Event, lineId: string) => {
    setEditingEvent(event);
    setEditingLineId(lineId);
  };

  const saveLineToDatabase = async (lineId: string, events: Event[]) => {
    try {
      setIsLocalUpdate(true);
      
      await supabaseClient
        .from('timeline_events')
        .delete()
        .eq('line_id', lineId);

      const eventsToInsert = events.map((e, index) => ({
        line_id: lineId,
        event_date: e.date,
        event_time: e.time,
        description: e.description,
        position: e.position,
        status: e.status,
        icon: e.icon,
        icon_size: e.iconSize,
        event_order: index,
      }));

      if (eventsToInsert.length > 0) {
        const { error } = await supabaseClient
          .from('timeline_events')
          .insert(eventsToInsert);

        if (error) {
          setIsLocalUpdate(false);
          throw error;
        }
      }
      
      setTimeout(() => {
        setIsLocalUpdate(false);
      }, 300);
    } catch (error: any) {
      setIsLocalUpdate(false);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <span className="text-lg">✅</span>;
      case 'no_response':
        return <span className="text-lg">🚫</span>;
      default:
        return <div className="w-1.5 h-1.5 bg-foreground/20 rounded-full" />;
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-[#0a1628]/95 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-[#0f1729] border border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 bg-[#0a1628]">
            <div className="h-8 bg-[#1e293b] animate-pulse rounded w-64 mb-6" />
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-[#1e293b] animate-pulse rounded-full" />
                <div className="flex-1 h-32 bg-[#1e293b] animate-pulse rounded-xl" />
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-[#1e293b] animate-pulse rounded-full" />
                <div className="flex-1 h-32 bg-[#1e293b] animate-pulse rounded-xl" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Helper para configuração dos ícones
  const getEventConfig = (icon: string) => {
    const configs: Record<string, { iconBg: string; badgeBg: string; label: string }> = {
      '💬': { iconBg: 'bg-blue-500', badgeBg: 'bg-blue-600', label: 'Mensagem' },
      '📞': { iconBg: 'bg-green-500', badgeBg: 'bg-green-600', label: 'Ligação' },
      '📅': { iconBg: 'bg-purple-500', badgeBg: 'bg-purple-600', label: 'Reunião' },
      '❌': { iconBg: 'bg-red-500', badgeBg: 'bg-red-600', label: 'Cancelamento' },
    };
    return configs[icon] || { iconBg: 'bg-gray-500', badgeBg: 'bg-gray-600', label: 'Outros' };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#0a1628]/95 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0f1729] border border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1e293b] bg-[#0a1628]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">
                {clientName}
              </h2>
              <Badge className="bg-red-500 text-white hover:bg-red-600">
                COBRANÇA
              </Badge>
            </div>
            <p className="text-sm text-gray-400">
              Timeline de eventos do cliente
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleAddLine}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg flex items-center gap-2 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={18} />
              Nova Linha
            </motion.button>
            
            <motion.button
              onClick={onClose}
              className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors text-gray-400 hover:text-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)] bg-[#0a1628]">
          {lines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Nenhuma linha criada ainda</p>
              <button
                onClick={handleAddLine}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
              >
                Criar Primeira Linha
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              {lines.map((line, lineIndex) => (
                <div key={line.id}>
                  {/* Header da linha */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">
                        Linha {lineIndex + 1}
                      </span>
                      <motion.button
                        onClick={() => handleAddEvent(line.id)}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Plus size={16} />
                        Evento
                      </motion.button>
                    </div>
                    
                    {lines.length > 1 && (
                      <motion.button
                        onClick={() => handleDeleteLine(line.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Excluir linha"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    )}
                  </div>

                  {line.events.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum evento nesta linha
                    </div>
                  ) : (
                    <div className="relative pl-8">
                      {/* Linha vertical */}
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#334155]" />
                      
                      {/* Eventos */}
                      <div className="space-y-6">
                        {line.events.map((event, index) => {
                          const config = getEventConfig(event.icon);
                          const isLast = index === line.events.length - 1;
                          
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -30 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                duration: 0.5, 
                                delay: index * 0.1,
                                ease: [0.22, 1, 0.36, 1]
                              }}
                              className="relative flex gap-6 items-start"
                            >
                              {/* Ícone circular grande */}
                              <motion.button
                                onClick={() => handleEventClick(event, line.id)}
                                className={`
                                  ${config.iconBg}
                                  w-12 h-12 min-w-[48px]
                                  rounded-full
                                  flex items-center justify-center
                                  text-white text-xl
                                  shadow-lg
                                  hover:scale-110
                                  hover:shadow-2xl
                                  hover:rotate-[5deg]
                                  transition-all duration-300
                                  cursor-pointer
                                  z-10
                                  absolute -left-[52px] top-0
                                `}
                                whileHover={{ 
                                  boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)" 
                                }}
                                title="Clique para editar"
                              >
                                {event.icon}
                              </motion.button>

                              {/* Card expandido */}
                              <div className="flex-1 ml-2">
                                <motion.div
                                  className="
                                    bg-[#1e293b]
                                    rounded-xl
                                    p-5
                                    border border-[#334155]
                                    hover:border-[#475569]
                                    hover:shadow-xl
                                    hover:transform
                                    hover:scale-[1.01]
                                    transition-all
                                    duration-300
                                  "
                                  whileHover={{ y: -2 }}
                                >
                                  {/* Data + Badge */}
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-lg font-bold text-white">
                                      {event.date}
                                    </span>
                                    <span className={`
                                      ${config.badgeBg}
                                      text-white
                                      text-xs
                                      font-medium
                                      px-3
                                      py-1.5
                                      rounded-md
                                    `}>
                                      {config.label}
                                    </span>
                                    
                                    {/* Status badge */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusToggle(line.id, event.id);
                                      }}
                                      className="ml-auto hover:scale-110 transition-transform"
                                    >
                                      {renderStatusIcon(event.status)}
                                    </button>
                                  </div>

                                  {/* Descrição */}
                                  <p className="text-sm text-gray-400 mb-3 leading-relaxed">
                                    {event.description || 'Sem descrição'}
                                  </p>

                                  {/* Dica */}
                                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <span>💡</span>
                                    <span>Clique no ícone para editar</span>
                                  </div>
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {editingEvent && (
          <EventModal
            event={editingEvent}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
            onCancel={() => {
              setEditingEvent(null);
              setEditingLineId(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
