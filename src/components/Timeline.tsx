import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Trash2 } from 'lucide-react';
import { EventModal } from './EventModal';
import { ClientInfoModal } from './ClientInfoModal';
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
  
  const lines = timeline.lines || [];
  const clientInfo = timeline.clientInfo || {
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    boletoValue: '',
    dueDate: new Date().toISOString().split('T')[0]
  };

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
          
          {/* Tag COBRANÇA */}
          <Badge className="bg-red-500 text-white hover:bg-red-600 px-3 py-1">
            COBRANÇA
          </Badge>
          
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
              
              {/* Botão + Evento */}
              {lines.length > 0 && (
                <motion.button
                  onClick={() => handleAddEvent(lines[0].id)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-all flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Adicionar evento na primeira linha"
                >
                  ➕ Evento
                </motion.button>
              )}
              
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
              {!readOnly && lines.length > 1 && (
                <div className="flex justify-center mb-10">
                  <motion.button 
                    onClick={() => handleAddEvent(line.id)} 
                    className="px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    + Adicionar Evento
                  </motion.button>
                </div>
              )}
              
              <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
                <div className="timeline-container relative flex items-center justify-between w-full mx-auto py-24 min-h-[200px] px-4">
                  {/* Contador de eventos - Verde */}
                  <div className="absolute top-[-4px] right-2 px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold z-30">
                    {(line.events || []).length} / 28
                  </div>
                  
                  {/* Linha central de ponta a ponta */}
            <button
              onClick={() => handleAddEvent(line.id)}
              disabled={readOnly}
              className={`absolute top-1/2 h-0.5 bg-foreground/30 -translate-y-1/2 z-0 left-4 right-4 ${
                !readOnly ? 'cursor-pointer hover:bg-foreground/50 hover:h-1 transition-all' : 'cursor-default'
              }`}
              title={!readOnly ? "Clique para adicionar evento" : ""}
            />
                  
                  {(line.events || []).map((event, index) => (
                    <motion.div
                      key={event.id}
                      className="relative z-10 text-center flex-shrink-0 min-w-[80px] -ml-[39px] first:ml-0"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      layout
                    >
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
                      className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform ${
                        event.position === 'bottom' ? 'top-5' : 'bottom-5'
                      }`}
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
                  </motion.div>
                  ))}
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
