import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { EventModal } from './EventModal';
import { ClientInfoModal } from './ClientInfoModal';

interface Event {
  id: number;
  icon: string;
  iconSize: string;
  date: string;
  description: string;
  position: 'top' | 'bottom';
  status: 'pending' | 'completed' | 'failed';
  isNew?: boolean;
}

interface ClientInfo {
  name: string;
  startDate: string;
  boletoValue: string;
  dueDate: string;
}

interface TimelineData {
  id: number;
  clientInfo: ClientInfo;
  events: Event[];
}

interface TimelineProps {
  timeline: TimelineData;
  updateEvents: (events: Event[]) => void;
  updateClientInfo: (info: ClientInfo) => void;
  onDelete?: () => void;
}

export const Timeline = ({ timeline, updateEvents, updateClientInfo, onDelete }: TimelineProps) => {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  
  const { events, clientInfo } = timeline;

  const handleAddEvent = () => {
    const newId = Date.now();
    const lastEvent = events[events.length - 1];
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
      status: 'pending',
      isNew: true,
    };
    updateEvents([...events, newEvent]);
    setEditingEvent(newEvent);
  };

  const handleSaveEvent = (updatedEvent: Event) => {
    updateEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id: number) => {
    updateEvents(events.filter(e => e.id !== id));
    setEditingEvent(null);
  };

  const handleEventClick = (event: Event) => {
    setEditingEvent(event);
  };

  const handleStatusToggle = (e: React.MouseEvent, eventId: number) => {
    e.stopPropagation();
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        const newStatus: 'pending' | 'completed' | 'failed' = event.status === 'pending' ? 'completed' : event.status === 'completed' ? 'failed' : 'pending';
        let newPosition: 'top' | 'bottom' = event.position;
        if (newStatus === 'completed') {
          newPosition = 'top';
        } else if (newStatus === 'failed') {
          newPosition = 'bottom';
        }
        return { ...event, status: newStatus, position: newPosition };
      }
      return event;
    });
    updateEvents(updatedEvents);
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xl">✅</span>;
      case 'failed':
        return <span className="text-xl">🚫</span>;
      default:
        return <div className="w-2 h-2 bg-foreground rounded-full" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowClientModal(true)}
          className="px-6 py-3 bg-gradient-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
        >
          {clientInfo.name}
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAddEvent} 
            className="px-6 py-3 font-semibold text-primary-foreground bg-gradient-primary rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            + Adicionar Evento
          </button>
          
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-3 bg-destructive text-destructive-foreground rounded-xl hover:scale-105 transition-transform"
              title="Excluir linha de cobrança"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="timeline-container relative flex justify-around items-start w-full mx-auto py-20 overflow-x-auto">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-foreground/30 -translate-y-1/2 z-0" />
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            className="relative z-10 w-36 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            layout
          >
            <button
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground flex items-center justify-center z-20 hover:scale-125 transition-transform"
              onClick={(e) => handleStatusToggle(e, event.id)}
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
              className={`absolute left-1/2 -translate-x-1/2 w-full flex flex-col items-center cursor-pointer ${
                event.position === 'bottom' ? 'top-5' : 'bottom-5'
              }`}
              onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
              title={event.description}
            >
              {event.position === 'bottom' ? (
                <>
                  <div className="text-sm font-semibold text-foreground mb-2">{event.date}</div>
                  <div className={`${event.iconSize || 'text-2xl'} transition-transform duration-300 hover:scale-110`}>
                    {event.icon}
                  </div>
                </>
              ) : (
                <>
                  <div className={`${event.iconSize || 'text-2xl'} mb-2 transition-transform duration-300 hover:scale-110`}>
                    {event.icon}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{event.date}</div>
                </>
              )}
            </div>
          </motion.div>
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
