import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, CheckCircle2 } from 'lucide-react';
import { formatEventDate, toISODate } from '@/lib/date-utils';
import { EventModal } from './EventModal';
import { ClientInfoModal } from './ClientInfoModal';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TagSelector } from './TagSelector';

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
}

interface TimelineProps {
  timeline: TimelineData;
  updateLine: (lineId: string, events: Event[]) => void;
  addNewLine?: () => void;
  deleteLine?: (lineId: string) => void;
  updateClientInfo: (info: ClientInfo) => void;
  onComplete?: () => void;
  readOnly?: boolean;
}

export const Timeline = ({ 
  timeline, 
  updateLine, 
  addNewLine, 
  deleteLine, 
  updateClientInfo, 
  onComplete,
  readOnly = true 
}: TimelineProps) => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [timelineTags, setTimelineTags] = useState<Array<{id: string, name: string, color: string}>>([]);
  const [showAllDescriptions, setShowAllDescriptions] = useState(true);
  
  const toggleAllDescriptions = () => {
    setShowAllDescriptions(prev => !prev);
  };

  const getCounterColor = (count: number) => {
    if (count <= 5) return 'bg-green-500';
    if (count <= 9) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const lines = timeline.lines || [];
  const today = new Date();
  const clientInfo = timeline.clientInfo || {
    name: '',
    startDate: toISODate(today),
    boletoValue: '',
    dueDate: toISODate(today)
  };

  const loadTimelineTags = async () => {
    if (!timeline.id) return;
    
    const { data, error } = await supabase
      .from('client_timeline_tags')
      .select(`
        tag_id,
        tags:tag_id (
          id,
          name,
          color
        )
      `)
      .eq('timeline_id', timeline.id);
    
    if (!error && data) {
      const tags = data
        .map(item => (item as any).tags)
        .filter(Boolean);
      setTimelineTags(tags);
    }
  };

  useEffect(() => {
    loadTimelineTags();
  }, [timeline.id]);

  const hasNoResponseEvent = lines.some(line => 
    line.events?.some(event => event.status === 'no_response')
  );

  const handleAddEvent = (lineId: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    
    const lineEvents = line.events || [];
    
    if (lineEvents.length >= 20) {
      if (addNewLine) {
        addNewLine();
      }
      return;
    }
    
    const newId = crypto.randomUUID();
    const lastEvent = lineEvents[lineEvents.length - 1];
    const newPosition = lastEvent?.position === 'top' ? 'bottom' : 'top';
    const todayDate = new Date();
    const dateStr = formatEventDate(todayDate);

    const newEvent: Event = {
      id: newId,
      icon: '💬',
      iconSize: 'text-2xl',
      date: dateStr,
      description: 'Novo evento',
      position: newPosition,
      status: 'created',
      isNew: true,
    };
    
    updateLine(lineId, [newEvent, ...lineEvents]);
    setEditingEvent(newEvent);
    setEditingLineId(lineId);
  };

  const handleSaveEvent = (updatedEvent: Event) => {
    if (editingLineId === null) return;
    const line = lines.find(l => l.id === editingLineId);
    if (!line) return;
    
    const lineEvents = line.events || [];
    updateLine(editingLineId, lineEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setEditingEvent(null);
    setEditingLineId(null);
  };

  const handleDeleteEvent = (id: string) => {
    if (editingLineId === null) return;
    const line = lines.find(l => l.id === editingLineId);
    if (!line) return;
    
    const lineEvents = line.events || [];
    const updatedEvents = lineEvents.filter(e => e.id !== id);
    
    const currentLineIndex = lines.findIndex(l => l.id === editingLineId);
    
    if (lines.length > 1) {
      if (currentLineIndex < lines.length - 1) {
        const nextLine = lines[currentLineIndex + 1];
        const mergedEvents = [...updatedEvents, ...(nextLine.events || [])];
        updateLine(editingLineId, mergedEvents);
        if (deleteLine && nextLine) {
          deleteLine(nextLine.id);
        }
      } else if (currentLineIndex > 0) {
        const prevLine = lines[currentLineIndex - 1];
        const mergedEvents = [...(prevLine.events || []), ...updatedEvents];
        updateLine(prevLine.id, mergedEvents);
        if (deleteLine) {
          deleteLine(editingLineId);
        }
      } else {
        updateLine(editingLineId, updatedEvents);
      }
    } else {
      updateLine(editingLineId, updatedEvents);
    }
    
    setEditingEvent(null);
    setEditingLineId(null);
  };

  const handleEventClick = (event: Event, lineId: string) => {
    if (readOnly) return;
    setEditingEvent(event);
    setEditingLineId(lineId);
  };

  const handleStatusToggle = (e: React.MouseEvent, lineId: string, eventId: string) => {
    e.stopPropagation();
    if (readOnly) return;
    
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    
    const lineEvents = line.events || [];
    const updatedEvents = lineEvents.map(event => {
      if (event.id === eventId) {
        let newStatus: 'created' | 'resolved' | 'no_response';
        if (event.status === 'created') {
          newStatus = 'resolved';
        } else if (event.status === 'resolved') {
          newStatus = 'no_response';
        } else {
          newStatus = 'created';
        }
        return { ...event, status: newStatus };
      }
      return event;
    });
    
    updateLine(lineId, updatedEvents);
  };

  const renderStatusIcon = (status: string) => {
    switch(status) {
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-white" />;
      case 'no_response':
        return <span className="text-white text-sm">🚫</span>;
      default:
        return <span className="w-2 h-2 bg-white rounded-full" />;
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between mb-6 p-4 bg-card rounded-lg border border-border sticky top-0 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            onClick={() => setShowClientModal(true)}
            className={`px-3 py-2 font-semibold rounded-lg hover:bg-accent transition-all text-sm flex items-center gap-2 ${
              hasNoResponseEvent ? 'text-red-600 dark:text-red-400' : 'text-foreground'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <User size={16} />
            {clientInfo.clientId ? `${clientInfo.clientId} - ${clientInfo.name}` : clientInfo.name}
          </motion.button>

          <motion.button
            onClick={toggleAllDescriptions}
            className={`px-3 py-2 font-semibold rounded-lg transition-all text-xs flex items-center gap-2 ${
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

          {!readOnly && (
            <motion.button
              onClick={() => handleAddEvent(lines[0]?.id)}
              className="px-3 py-2 font-semibold rounded-lg transition-all text-xs flex items-center gap-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Adicionar novo evento"
            >
              ➕ Evento
            </motion.button>
          )}
        
          {!readOnly ? (
            <TagSelector
              timelineId={timeline.id}
              organizationId={timeline.organization_id || ''}
              selectedTags={timelineTags}
              onTagsChange={loadTimelineTags}
            />
          ) : (
            timelineTags.map(tag => (
              <Badge 
                key={tag.id}
                style={{ backgroundColor: tag.color }}
                className="text-white px-3 py-1"
              >
                {tag.name}
              </Badge>
            ))
          )}
        
          {!readOnly && addNewLine && (
            <>
              <motion.button
                onClick={addNewLine}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Adicionar nova linha"
              >
                ✏️ Linha
              </motion.button>
              
              <Badge 
                className="bg-orange-500 text-white hover:bg-orange-600 px-3 py-1 cursor-pointer"
                onClick={() => setShowClientModal(true)}
                title="Clique para editar o valor"
              >
                💰 R$ {parseFloat(clientInfo.boletoValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Badge>
            </>
          )}
        </div>
        
        {!readOnly && onComplete && (
          <motion.button
            onClick={onComplete}
            className="p-2 bg-green-500/10 text-green-500 rounded-lg transition-all hover:bg-green-500/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Finalizar cobrança"
          >
            <CheckCircle2 size={18} />
          </motion.button>
        )}
      </motion.div>

      {/* Timeline */}
      <div className="space-y-8">
        {lines.map((line) => (
          <div key={line.id} className="relative">
            <div className="overflow-y-auto overflow-x-visible custom-scrollbar scroll-smooth min-h-[calc(100vh-250px)]">
              <div className="timeline-container relative w-full max-w-4xl mx-auto py-8 px-12">
                
                {/* Contador de eventos */}
                <div className={`absolute top-2 right-4 w-10 h-10 ${getCounterColor((line.events || []).length)} text-white rounded-full text-sm font-bold z-30 transition-colors duration-300 flex items-center justify-center shadow-lg border-2 border-background`}>
                  {(line.events || []).length}
                </div>
                
                {/* Linha vertical central */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-muted -translate-x-1/2 z-0" />

                {/* Eventos */}
                <div className="relative space-y-16 pt-4 pb-20">
                  <AnimatePresence mode="popLayout">
                    {(line.events || []).map((event, index) => {
                      const isResolved = event.status === 'resolved';
                      const isNoResponse = event.status === 'no_response';
                      
                      return (
                        <motion.div
                          key={event.id}
                          layout
                          initial={{ opacity: 0, x: -50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="relative flex items-start gap-6 group"
                        >
                          {/* Ícone central */}
                          <div className="relative flex-shrink-0 z-10">
                            <button
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                isResolved
                                  ? 'bg-green-500 hover:bg-green-600'
                                  : isNoResponse
                                  ? 'bg-muted hover:bg-muted/80'
                                  : 'bg-green-500 hover:bg-green-600'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!readOnly) handleStatusToggle(e, line.id, event.id);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event, line.id);
                              }}
                              title="Clique para mudar status, duplo clique para editar"
                            >
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={event.status}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="text-lg"
                                >
                                  {event.icon}
                                </motion.div>
                              </AnimatePresence>
                            </button>
                          </div>

                          {/* Conteúdo do evento */}
                          <div 
                            className="flex-1 pt-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!readOnly) handleEventClick(event, line.id);
                            }}
                          >
                            <div className="flex items-baseline gap-3 mb-1">
                              <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                                {event.date}
                              </span>
                              {showAllDescriptions && event.description && (
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-sm text-foreground"
                                >
                                  {event.description}
                                </motion.span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Botão adicionar evento no final */}
                  {!readOnly && (
                    <motion.button
                      onClick={() => handleAddEvent(line.id)}
                      className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform z-10 shadow-lg"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      title="Adicionar evento"
                    >
                      +
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingEvent && (
          <EventModal
            event={editingEvent}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
            onCancel={() => setEditingEvent(null)}
          />
        )}
        {showClientModal && (
          <ClientInfoModal
            clientInfo={clientInfo}
            onSave={(info) => {
              updateClientInfo(info);
              setShowClientModal(false);
            }}
            onCancel={() => setShowClientModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
