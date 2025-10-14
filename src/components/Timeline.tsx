import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trash2, ChevronUp, ChevronDown, Minus } from 'lucide-react';
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
  onDelete?: () => void;
  readOnly?: boolean;
}

export const Timeline = ({ 
  timeline, 
  updateLine, 
  addNewLine, 
  deleteLine, 
  updateClientInfo, 
  onDelete,
  readOnly = true 
}: TimelineProps) => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [timelineTags, setTimelineTags] = useState<Array<{id: string, name: string, color: string}>>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllDescriptions, setShowAllDescriptions] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  
  const toggleAllDescriptions = () => {
    setShowAllDescriptions(prev => !prev);
  };
  
  const lines = timeline.lines || [];
  const clientInfo = timeline.clientInfo || {
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    boletoValue: '',
    dueDate: new Date().toISOString().split('T')[0]
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

  // Carregar tags do timeline
  useEffect(() => {
    loadTimelineTags();
  }, [timeline.id]);

  // Verifica se há algum evento com status 'no_response' (ícone 🚫)
  const hasNoResponseEvent = lines.some(line => 
    line.events?.some(event => event.status === 'no_response')
  );

  const handleAddEvent = (lineId: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    
    const lineEvents = line.events || [];
    
    // Se a linha já tem 28 eventos, criar uma nova linha
    if (lineEvents.length >= 28) {
      if (addNewLine) {
        addNewLine();
      }
      return;
    }
    
    const newId = crypto.randomUUID();
    const lastEvent = lineEvents[lineEvents.length - 1];
    const newPosition = lastEvent?.position === 'top' ? 'bottom' : 'top';
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;

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
    
    updateLine(lineId, [...lineEvents, newEvent]);
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
    
    // Se houver múltiplas linhas, tentar consolidar
    if (lines.length > 1) {
      // Tentar consolidar com a próxima linha primeiro
      if (currentLineIndex < lines.length - 1) {
        const nextLine = lines[currentLineIndex + 1];
        const totalEvents = updatedEvents.length + (nextLine.events?.length || 0);
        
        if (totalEvents <= 28) {
          const mergedEvents = [...updatedEvents, ...(nextLine.events || [])];
          updateLine(editingLineId, mergedEvents);
          
          if (deleteLine) {
            deleteLine(nextLine.id);
          }
          
          setEditingEvent(null);
          setEditingLineId(null);
          return;
        }
      }
      
      // Se não consolidou com a próxima, tentar com a anterior
      if (currentLineIndex > 0) {
        const prevLine = lines[currentLineIndex - 1];
        const totalEvents = (prevLine.events?.length || 0) + updatedEvents.length;
        
        if (totalEvents <= 28) {
          const mergedEvents = [...(prevLine.events || []), ...updatedEvents];
          updateLine(prevLine.id, mergedEvents);
          
          if (deleteLine) {
            deleteLine(editingLineId);
          }
          
          setEditingEvent(null);
          setEditingLineId(null);
          return;
        }
      }
    }
    
    // Se não consolidou, apenas atualiza a linha atual
    updateLine(editingLineId, updatedEvents);
    setEditingEvent(null);
    setEditingLineId(null);
  };

  const handleEventClick = (event: Event, lineId: string) => {
    setEditingEvent(event);
    setEditingLineId(lineId);
  };

  const handleStatusToggle = (e: React.MouseEvent, lineId: string, eventId: string) => {
    e.stopPropagation();
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    
    const lineEvents = line.events || [];
    const updatedEvents = lineEvents.map(event => {
      if (event.id === eventId) {
        const newStatus: 'created' | 'resolved' | 'no_response' = 
          event.status === 'created' ? 'resolved' : 
          event.status === 'resolved' ? 'no_response' : 'created';
        let newPosition: 'top' | 'bottom' = event.position;
        if (newStatus === 'resolved') {
          newPosition = 'top';
        } else if (newStatus === 'no_response') {
          newPosition = 'bottom';
        }
        return { ...event, status: newStatus, position: newPosition };
      }
      return event;
    });
    updateLine(lineId, updatedEvents);
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

  // Função para determinar a cor dos segmentos da linha
  const getLineSegmentColor = (currentEvent: Event, nextEvent: Event) => {
    // Verificação null-safe para os eventos e suas datas
    if (!currentEvent?.date || !nextEvent?.date) {
      return 'bg-foreground/30';
    }
    
    // Normalizar as datas removendo espaços extras
    const currentDate = currentEvent.date.trim();
    const nextDate = nextEvent.date.trim();
    
    // Se as datas são iguais, retorna amarelo
    if (currentDate === nextDate) {
      return 'bg-yellow-500';
    }
    
    return 'bg-foreground/30'; // cor padrão (cinza)
  };

  return (
    <div className="w-full">
      <motion.div 
        className="flex items-center justify-between mb-4 flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nome clicável com ID do cliente */}
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
          
            {/* Tag Selector com Dropdown ou Tags read-only */}
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
              {/* Botão + Linha */}
              <motion.button
                onClick={addNewLine}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Adicionar nova linha"
              >
                ✏️ Linha
              </motion.button>
              
              {/* Badge Valor */}
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
        
        {/* Lado direito: Lixeira */}
        {!readOnly && onDelete && (
          <motion.button
            onClick={onDelete}
            className="p-2 bg-destructive/10 text-destructive rounded-lg transition-all hover:bg-destructive/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Excluir cliente"
          >
            <Trash2 size={18} />
          </motion.button>
        )}
      </motion.div>

      <div className="space-y-8">
        {lines.map((line, lineIndex) => (
          <div 
            key={line.id} 
            className="relative"
          >
              
              <div className={isVertical ? "overflow-y-auto overflow-x-visible scrollbar-hide" : "overflow-x-auto overflow-y-visible scrollbar-hide"}>
                <div 
                  className={`timeline-container relative w-full mx-auto transition-all duration-300 ${
                    isVertical 
                      ? 'flex flex-col items-center py-12 px-24' 
                      : 'flex items-center py-24 px-12'
                  }`}
                  style={{ 
                    minHeight: isVertical ? '600px' : `${isExpanded ? 550 : 200}px`,
                    minWidth: isVertical ? 'auto' : '100%'
                  }}
                >
                  {/* Contador de eventos - Verde */}
                  <div className="absolute top-[-4px] right-2 px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold z-30">
                    {(line.events || []).length} / 28
                  </div>
                  
                  {/* Botão toggle único - centralizado no canto inferior */}
                  {!readOnly && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 z-40 w-10 h-10 rounded-full bg-background/90 border-2 border-border hover:bg-accent flex items-center justify-center shadow-lg transition-all"
                      title={isExpanded ? "Diminuir altura" : "Aumentar altura"}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  )}
                  
                  {/* Linha base - sempre visível e clicável quando há 0 ou 1 evento */}
                  {(line.events || []).length < 2 ? (
                    <button
                      onClick={() => handleAddEvent(line.id)}
                      disabled={readOnly}
                      className={`absolute bg-foreground/30 z-0 transition-all ${
                        isVertical
                          ? 'left-1/2 w-1 h-[calc(100%-48px)] top-6 -translate-x-1/2'
                          : 'top-1/2 h-1 -translate-y-1/2 left-[1.5%] right-[1.5%]'
                      } ${
                        !readOnly ? 'cursor-pointer hover:bg-foreground/50' : 'cursor-default'
                      }`}
                      title={!readOnly ? "Clique para adicionar evento" : ""}
                    />
                  ) : (
                    <div 
                      className={`absolute bg-foreground/30 z-0 ${
                        isVertical
                          ? 'left-1/2 w-1 h-[calc(100%-48px)] top-6 -translate-x-1/2'
                          : 'top-1/2 h-1 -translate-y-1/2 left-[1.5%] right-[1.5%]'
                      }`}
                    />
                  )}

                  {/* Segmentos coloridos sobrepostos (apenas quando há 2+ eventos) */}
                  {(line.events || []).length >= 2 && (line.events || []).map((event, index) => {
                    if (index === (line.events || []).length - 1) return null;
                    
                    const nextEvent = (line.events || [])[index + 1];
                    const segmentColor = getLineSegmentColor(event, nextEvent);
                    const isSameDate = event.date === nextEvent?.date;
                    
                    // Cálculo preciso baseado no centro dos ícones
                    const totalEvents = (line.events || []).length;
                    const currentIconCenter = totalEvents === 1 ? 50 : 1.5 + (index / (totalEvents - 1)) * 97;
                    const nextIconCenter = totalEvents === 1 ? 50 : 1.5 + ((index + 1) / (totalEvents - 1)) * 97;
                    
                    return (
                      <button
                        key={`segment-${event.id}-${nextEvent?.id}`}
                        onClick={() => handleAddEvent(line.id)}
                        disabled={readOnly}
                        className={`absolute ${segmentColor} z-10 transition-all ${
                          isVertical
                            ? 'left-1/2 w-1 -translate-x-1/2'
                            : 'top-1/2 h-1 -translate-y-1/2'
                        } ${
                          !readOnly ? 'cursor-pointer' : 'cursor-default'
                        } ${isSameDate ? 'hover:bg-yellow-600' : 'hover:bg-foreground/50'}`}
                        style={isVertical ? {
                          top: `${currentIconCenter}%`,
                          bottom: `${100 - nextIconCenter}%`
                        } : {
                          left: `${currentIconCenter}%`,
                          right: `${100 - nextIconCenter}%`
                        }}
                        title={!readOnly ? "Clique para adicionar evento" : ""}
                      />
                    );
                  })}
                  
                  {(line.events || []).map((event, index) => {
                    const totalEvents = (line.events || []).length;
                    const position = totalEvents === 1 ? 50 : 1.5 + (index / (totalEvents - 1)) * 97;
                    
                    return (
                      <motion.div
                        key={event.id}
                        className={`absolute z-10 text-center flex-shrink-0 ${
                          isVertical ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2'
                        }`}
                        style={isVertical 
                          ? { top: `${position}%` }
                          : { left: `${position}%`, transform: 'translateX(-50%)' }
                        }
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        layout
                      >
            {isVertical ? (
              <>
                {/* Status SEMPRE fixo na linha */}
                <button
                  onClick={(e) => {
                    handleStatusToggle(e, line.id, event.id);
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-transparent flex items-center justify-center z-20 hover:scale-110 transition-transform cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={event.status}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderStatusIcon(event.status)}
                    </motion.div>
                  </AnimatePresence>
                </button>

                {/* Elementos ao redor do status */}
                {event.status === 'no_response' ? (
                  // Elementos à ESQUERDA do status
                  <div className="absolute flex flex-row items-center gap-3 top-1/2 -translate-y-1/2 right-[calc(50%+20px)]">
                    <div
                      className="text-2xl cursor-pointer hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event, line.id);
                      }}
                      title={event.description}
                    >
                      {event.icon}
                    </div>
                    <div className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {event.date}
                    </div>
                    {showAllDescriptions && event.description && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-foreground text-sm font-medium bg-background/90 px-2 py-1 rounded whitespace-nowrap">
                          {event.description.length > 30 ? `${event.description.substring(0, 30)}...` : event.description}
                        </p>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  // Elementos à DIREITA do status
                  <div className="absolute flex flex-row items-center gap-3 top-1/2 -translate-y-1/2 left-[calc(50%+20px)]">
                    <div
                      className="text-2xl cursor-pointer hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event, line.id);
                      }}
                      title={event.description}
                    >
                      {event.icon}
                    </div>
                    <div className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {event.date}
                    </div>
                    {showAllDescriptions && event.description && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-foreground text-sm font-medium bg-background/90 px-2 py-1 rounded whitespace-nowrap">
                          {event.description.length > 30 ? `${event.description.substring(0, 30)}...` : event.description}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </>
            ) : (
                      <>
                        <button
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-transparent flex items-center justify-center z-20 hover:scale-110 transition-transform"
                          onClick={(e) => handleStatusToggle(e, line.id, event.id)}
                        >
                          <AnimatePresence mode="popLayout">
                            <motion.div
                              key={event.status}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center justify-center"
                            >
                              {renderStatusIcon(event.status)}
                            </motion.div>
                          </AnimatePresence>
                        </button>
                        <div
                          className={`absolute w-full flex flex-col items-center gap-1 ${
                            event.position === 'bottom' ? 'top-5 left-1/2 -translate-x-1/2' : 'bottom-5 left-1/2 -translate-x-1/2'
                          }`}
                        >
                          <div
                            className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event, line.id);
                            }}
                            title={event.description}
                          >
                            {event.position === 'bottom' ? (
                              <>
                                <div className="text-xs font-semibold text-foreground mb-2 whitespace-nowrap">
                                  {event.date}
                                </div>
                                <div className="leading-none flex items-center justify-center">
                                  <span className="text-2xl">{event.icon}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="mb-2 leading-none flex items-center justify-center">
                                  <span className="text-2xl">{event.icon}</span>
                                </div>
                                <div className="text-xs font-semibold text-foreground whitespace-nowrap">
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
              </div>
            </div>
          ))}
      </div>
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
