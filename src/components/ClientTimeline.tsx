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
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [isLocalUpdate, setIsLocalUpdate] = useState(false);
  const reloadTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  
  const toggleAllDescriptions = () => {
    setShowAllDescriptions(prev => !prev);
  };

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
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {clientName}
              </h2>
              <Badge className="bg-red-500 text-white hover:bg-red-600">
                COBRANÇA
              </Badge>
              <motion.button
                onClick={() => setIsVertical(!isVertical)}
                className="px-2 py-2 rounded-lg hover:bg-accent transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isVertical ? "Alternar para horizontal" : "Alternar para vertical"}
              >
                <Minus size={20} className={isVertical ? "rotate-90" : ""} />
              </motion.button>
              <motion.button
                onClick={toggleAllDescriptions}
                className={`px-3 py-1.5 font-semibold rounded-lg transition-all text-xs flex items-center gap-2 ${
                  showAllDescriptions 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={showAllDescriptions ? "Ocultar todas descrições" : "Mostrar todas descrições"}
              >
                {showAllDescriptions ? '👁️ Ocultar' : '📝 Ver Descrições'}
              </motion.button>
            </div>
            <p className="text-sm text-muted-foreground">
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
                    <div className={`timeline-container relative w-full py-12 transition-all duration-300 bg-gradient-to-br from-purple-900/20 via-purple-800/10 to-purple-900/20 rounded-xl ${
                      isVertical 
                        ? 'flex flex-col items-center min-h-[600px] px-16' 
                        : 'flex justify-around items-start overflow-x-auto'
                    }`}>
                      <div className={`absolute bg-purple-500/30 shadow-lg shadow-purple-500/20 rounded-full z-0 ${
                        isVertical
                          ? 'left-1/2 w-2 h-[calc(100%-48px)] top-6 -translate-x-1/2'
                          : 'top-1/2 left-0 w-full h-2 -translate-y-1/2'
                      }`} />
                      {line.events.map((event, index) => {
                        const totalEvents = line.events.length;
                        const position = totalEvents === 1 ? 50 : 10 + (index / (totalEvents - 1)) * 80;
                        const isLeftSide = index % 2 === 0;
                        
                        // Cores baseadas no status
                        const getStatusStyles = () => {
                          switch(event.status) {
                            case 'resolved':
                              return {
                                iconBg: 'bg-gradient-to-br from-green-400 to-green-600',
                                cardBorder: 'border-green-500/50',
                                cardBg: 'bg-green-500/5',
                              };
                            case 'no_response':
                              return {
                                iconBg: 'bg-gradient-to-br from-red-400 to-red-600',
                                cardBorder: 'border-red-500/50',
                                cardBg: 'bg-red-500/5',
                              };
                            default: // created
                              return {
                                iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
                                cardBorder: 'border-orange-500/50',
                                cardBg: 'bg-orange-500/5',
                              };
                          }
                        };
                        
                        const statusStyles = getStatusStyles();
                        
                        return (
                          <motion.div
                            key={event.id}
                            className={`absolute flex items-center gap-6 w-[calc(50%-60px)] ${
                              isVertical 
                                ? isLeftSide 
                                  ? 'left-0 flex-row-reverse' 
                                  : 'right-0 flex-row'
                                : 'w-32'
                            }`}
                            style={isVertical ? { top: `${position}%` } : {}}
                            initial={{ opacity: 0, x: isLeftSide ? -50 : 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                          >
            {isVertical ? (
              <>
                {/* Ícone circular grande na linha central */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusToggle(line.id, event.id);
                  }}
                  className={`absolute ${
                    isLeftSide ? 'right-[-48px]' : 'left-[-48px]'
                  } w-16 h-16 ${statusStyles.iconBg} rounded-full flex items-center justify-center shadow-xl z-20 cursor-pointer border-4 border-background transition-all hover:scale-110`}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl">{renderStatusIcon(event.status)}</span>
                </motion.button>
                
                {/* Card do evento */}
                <motion.div
                  onClick={() => handleEventClick(event, line.id)}
                  className={`flex-1 p-5 rounded-2xl border-2 ${statusStyles.cardBorder} ${statusStyles.cardBg} backdrop-blur-sm cursor-pointer transition-all hover:shadow-2xl hover:scale-[1.02]`}
                  whileHover={{ y: -4 }}
                >
                  {/* Data e hora no topo */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 pb-2 border-b border-border/30">
                    <span className="flex items-center gap-1">
                      📅 {event.date}
                    </span>
                    {event.time && (
                      <span className="flex items-center gap-1">
                        🕐 {event.time}
                      </span>
                    )}
                  </div>
                  
                  {/* Descrição */}
                  {(showAllDescriptions || event.description) && (
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {event.description || 'Sem descrição'}
                    </p>
                  )}
                </motion.div>
              </>
            ) : (
                            <>
                              <button
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-transparent flex items-center justify-center z-20 hover:scale-125 transition-transform"
                                onClick={() => handleStatusToggle(line.id, event.id)}
                              >
                                <div className="flex items-center justify-center">
                                  {renderStatusIcon(event.status)}
                                </div>
                              </button>
                              
                              <div
                                className={`absolute w-full flex flex-col items-center gap-1 ${
                                  event.position === 'bottom' ? 'top-5 left-1/2 -translate-x-1/2' : 'bottom-5 left-1/2 -translate-x-1/2'
                                }`}
                              >
                                <div
                                  className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
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
                                
                                <AnimatePresence>
                                  {showAllDescriptions && event.description && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                                      animate={{ 
                                        opacity: 1, 
                                        scale: 1,
                                        rotate: event.position === 'bottom' ? 45 : -45
                                      }}
                                      exit={{ opacity: 0, scale: 0.8, rotate: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className={`absolute whitespace-nowrap z-50 pointer-events-none ${
                                        event.position === 'bottom' 
                                          ? 'top-12' 
                                          : 'bottom-12'
                                      }`}
                                      style={{
                                        transformOrigin: event.position === 'bottom' ? 'top left' : 'bottom left',
                                        left: '0',
                                        marginLeft: '20px',
                                      }}
                                    >
                                      <p 
                                        className="text-foreground text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-background/90 px-2 py-1 rounded"
                                        title={event.description}
                                      >
                                        {event.description.length > 30 
                                          ? `${event.description.substring(0, 30)}...` 
                                          : event.description
                                        }
                                      </p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </>
                          )}
                        </motion.div>
                        );
                      })}
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
