import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { EventModal } from './EventModal';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    loadTimeline();
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
                description: e.description || '',
                position: e.position as 'top' | 'bottom',
                status: e.status as 'created' | 'resolved' | 'no_response',
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
      currentLine.events.push({ ...event, isNew: false });
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
      await supabaseClient
        .from('timeline_events')
        .delete()
        .eq('line_id', lineId);

      const eventsToInsert = events.map((e, index) => ({
        line_id: lineId,
        event_date: e.date,
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

        if (error) throw error;
      }
    } catch (error: any) {
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
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="h-8 bg-muted animate-pulse rounded w-64 mb-4" />
            <div className="space-y-4">
              <div className="h-32 bg-muted animate-pulse rounded" />
              <div className="h-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Timeline - {clientName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie as linhas e eventos deste cliente
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleAddLine}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-lg flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus size={18} />
              Nova Linha
            </motion.button>
            
            <motion.button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {lines.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Nenhuma linha criada ainda</p>
              <button
                onClick={handleAddLine}
                className="px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-xl"
              >
                Criar Primeira Linha
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {lines.map((line, lineIndex) => (
                <div key={line.id} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">
                        Linha {lineIndex + 1}
                      </span>
                      <motion.button
                        onClick={() => handleAddEvent(line.id)}
                        className="px-3 py-1.5 text-sm bg-gradient-primary text-primary-foreground rounded-lg flex items-center gap-1"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Plus size={16} />
                        Adicionar Evento
                      </motion.button>
                    </div>
                    
                    {lines.length > 1 && (
                      <motion.button
                        onClick={() => handleDeleteLine(line.id)}
                        className="p-2 bg-destructive text-destructive-foreground rounded-lg"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Excluir linha"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    )}
                  </div>

                  {line.events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum evento nesta linha
                    </div>
                  ) : (
                    <div className="timeline-container relative flex justify-around items-start w-full py-12 overflow-x-auto">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-foreground/30 -translate-y-1/2 z-0" />
                      {line.events.map((event, index) => (
                        <div
                          key={event.id}
                          className="relative z-10 w-32 text-center"
                        >
                          <button
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-transparent flex items-center justify-center z-20 hover:scale-125 transition-transform"
                            onClick={() => handleStatusToggle(line.id, event.id)}
                          >
                            <div className="flex items-center justify-center">
                              {renderStatusIcon(event.status)}
                            </div>
                          </button>
                          
                          <div
                            className={`absolute left-1/2 -translate-x-1/2 w-full flex flex-col items-center cursor-pointer hover:scale-105 transition-transform ${
                              event.position === 'bottom' ? 'top-5' : 'bottom-5'
                            }`}
                            onClick={() => handleEventClick(event, line.id)}
                            title={event.description}
                          >
                            {event.position === 'bottom' ? (
                              <>
                                <div className="text-sm font-semibold text-foreground mb-2">
                                  {event.date}
                                </div>
                                <div className={`${event.iconSize || 'text-2xl'}`}>
                                  {event.icon}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={`${event.iconSize || 'text-2xl'} mb-2`}>
                                  {event.icon}
                                </div>
                                <div className="text-sm font-semibold text-foreground">
                                  {event.date}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
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
