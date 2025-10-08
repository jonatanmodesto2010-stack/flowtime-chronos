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
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.button
          onClick={() => setShowClientModal(true)}
          className="px-4 py-2 text-foreground font-semibold rounded-lg hover:bg-accent transition-all text-sm flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <User size={16} />
          {clientInfo.name}
        </motion.button>
        
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
              {!readOnly && (
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
                  
                  {lines.length > 1 && deleteLine && (
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
              )}
              
              <div className="timeline-container relative flex justify-around items-start w-full mx-auto py-24 overflow-x-auto">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-foreground/30 -translate-y-1/2 z-0" />
                {(line.events || []).map((event, index) => (
                  <div
                    key={event.id}
                    className="relative z-10 w-24 text-center flex-shrink-0"
                  >
                    <button
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-foreground flex items-center justify-center z-20 hover:scale-125 transition-transform"
                      onClick={(e) => handleStatusToggle(e, line.id, event.id)}
                    >
                      <div className="flex items-center justify-center scale-90">
                        {renderStatusIcon(event.status)}
                      </div>
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
                          <div className="text-xs font-semibold text-foreground mb-1 whitespace-nowrap">
                            {event.date}
                          </div>
                          <div className={`${event.iconSize || 'text-3xl'} leading-none`}>
                            {event.icon}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`${event.iconSize || 'text-3xl'} mb-1 leading-none`}>
                            {event.icon}
                          </div>
                          <div className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {event.date}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
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
