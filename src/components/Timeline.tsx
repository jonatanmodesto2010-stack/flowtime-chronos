import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, User } from 'lucide-react';
import { EventModal } from './EventModal';
import { ClientInfoModal } from './ClientInfoModal';

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
  addNewLine: () => void;
  deleteLine: (lineId: string) => void;
  updateClientInfo: (info: ClientInfo) => void;
  onDelete?: () => void;
}

export const Timeline = ({ timeline, updateLine, addNewLine, deleteLine, updateClientInfo, onDelete }: TimelineProps) => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  
  const lines = timeline.lines || [];
  const clientInfo = timeline.clientInfo || {
    name: 'Cliente',
    startDate: new Date().toISOString().split('T')[0],
    boletoValue: '0.00',
    dueDate: new Date().toISOString().split('T')[0]
  };

  const handleAddEvent = (lineId: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    
    const newId = crypto.randomUUID();
    const lineEvents = line.events || [];
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
    updateLine(editingLineId, lineEvents.filter(e => e.id !== id));
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
        return <span className="text-xl">✅</span>;
      case 'no_response':
        return <span className="text-xl">❌</span>;
      default:
        return <div className="w-3 h-3 bg-[hsl(var(--status-created))] rounded-full" />;
    }
  };

  return (
    <div className="w-full">
      <motion.div 
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowClientModal(true)}
            className="px-6 py-3 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-lg transition-all"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <User className="inline mr-2" size={18} />
            {clientInfo.name}
          </motion.button>
          
          <motion.button
            onClick={addNewLine}
            className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg transition-all"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            title="Adicionar nova linha de timeline abaixo"
          >
            <Plus className="inline mr-1" size={18} />
            Nova Linha
          </motion.button>
        </div>
        
        <div className="flex items-center gap-4">
          {onDelete && (
            <motion.button
              onClick={onDelete}
              className="p-3 bg-destructive text-destructive-foreground rounded-xl transition-all"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              title="Excluir esta linha de cobrança completa"
            >
              <Trash2 size={20} />
            </motion.button>
          )}
        </div>
      </motion.div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {lines.map((line, lineIndex) => (
            <motion.div 
              key={line.id} 
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: lineIndex * 0.1 }}
              layout
            >
              <div className="flex items-center gap-4 mb-4">
                <motion.button 
                  onClick={() => handleAddEvent(line.id)} 
                  className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-gradient-primary rounded-lg shadow-lg transition-all"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Adiciona um novo evento nesta linha"
                >
                  <Plus className="inline mr-1" size={16} />
                  Adicionar Evento
                </motion.button>
                
                {lines.length > 1 && (
                  <motion.button
                    onClick={() => deleteLine(line.id)}
                    className="px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg transition-all"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    title="Excluir esta linha"
                  >
                    <Trash2 className="inline mr-1" size={16} />
                    Excluir Linha
                  </motion.button>
                )}
              </div>
              
              <div className="timeline-container relative flex justify-around items-start w-full mx-auto py-20 overflow-x-auto">
                <motion.div 
                  className="absolute top-1/2 left-0 w-full h-0.5 bg-foreground/30 -translate-y-1/2 z-0"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: lineIndex * 0.1 }}
                />
                <AnimatePresence mode="popLayout">
                  {(line.events || []).map((event, index) => (
                    <motion.div
                      key={event.id}
                      className="relative z-10 w-36 text-center"
                      initial={{ opacity: 0, scale: 0.8, y: event.position === 'bottom' ? -20 : 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 200
                      }}
                      layout
                    >
                      <motion.button
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground flex items-center justify-center z-20 transition-all"
                        onClick={(e) => handleStatusToggle(e, line.id, event.id)}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={event.status}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center justify-center"
                          >
                            {renderStatusIcon(event.status)}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                      <motion.div
                        className={`absolute left-1/2 -translate-x-1/2 w-full flex flex-col items-center cursor-pointer ${
                          event.position === 'bottom' ? 'top-5' : 'bottom-5'
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleEventClick(event, line.id); }}
                        title={event.description}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {event.position === 'bottom' ? (
                          <>
                            <motion.div 
                              className="text-sm font-semibold text-foreground mb-2"
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 + 0.2 }}
                            >
                              {event.date}
                            </motion.div>
                            <motion.div 
                              className={`${event.iconSize || 'text-2xl'}`}
                              whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                            >
                              {event.icon}
                            </motion.div>
                          </>
                        ) : (
                          <>
                            <motion.div 
                              className={`${event.iconSize || 'text-2xl'} mb-2`}
                              whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                            >
                              {event.icon}
                            </motion.div>
                            <motion.div 
                              className="text-sm font-semibold text-foreground"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 + 0.2 }}
                            >
                              {event.date}
                            </motion.div>
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
