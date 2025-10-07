import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Plus, X } from 'lucide-react';
import { Timeline } from '@/components/Timeline';

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

const initialTimelinesData: TimelineData[] = [{
  id: 1,
  clientInfo: {
    name: 'Cliente Exemplo',
    startDate: '2024-08-10',
    boletoValue: '150.00',
    dueDate: '2024-08-25'
  },
  events: [{
    id: 1,
    icon: '💬',
    iconSize: 'text-2xl',
    date: '10/08',
    description: 'Cobrei o cliente e sem resposta.',
    position: 'top',
    status: 'pending'
  }, {
    id: 2,
    icon: '📅',
    iconSize: 'text-2xl',
    date: '11/08',
    description: 'Cliente pediu o boleto.',
    position: 'bottom',
    status: 'completed'
  }, {
    id: 3,
    icon: '📄',
    iconSize: 'text-2xl',
    date: '15/08',
    description: 'Enviei o boleto para o cliente.',
    position: 'top',
    status: 'pending'
  }]
}];

const Index = () => {
  const [theme, setTheme] = useState('light');
  const [timelines, setTimelines] = useState<TimelineData[]>(() => {
    const saved = localStorage.getItem('timelines');
    return saved ? JSON.parse(saved) : initialTimelinesData;
  });
  const [activeTimelineId, setActiveTimelineId] = useState(() => {
    const saved = localStorage.getItem('activeTimelineId');
    return saved ? parseInt(saved) : 1;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('timelines', JSON.stringify(timelines));
  }, [timelines]);

  useEffect(() => {
    localStorage.setItem('activeTimelineId', activeTimelineId.toString());
  }, [activeTimelineId]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleAddTimeline = () => {
    const today = new Date().toISOString().split('T')[0];
    const newTimeline: TimelineData = {
      id: Date.now(),
      clientInfo: {
        name: 'NOVO CLIENTE',
        startDate: today,
        boletoValue: '0.00',
        dueDate: today
      },
      events: [{
        id: Date.now() + 1,
        icon: '📋',
        iconSize: 'text-2xl',
        date: '--/--',
        description: 'Novo evento',
        position: 'top',
        status: 'pending'
      }]
    };
    setTimelines([...timelines, newTimeline]);
    setActiveTimelineId(newTimeline.id);
  };

  const handleDeleteTimeline = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir esta linha do tempo e todos os seus eventos?')) {
      setTimelines(timelines.filter(t => t.id !== id));
      if (activeTimelineId === id && timelines.length > 1) {
        setActiveTimelineId(timelines[0].id === id ? timelines[1].id : timelines[0].id);
      }
    }
  };

  const updateEvents = (updatedEvents: Event[]) => {
    setTimelines(timelines.map(t => t.id === activeTimelineId ? {
      ...t,
      events: updatedEvents
    } : t));
  };

  const updateClientInfo = (newInfo: ClientInfo) => {
    setTimelines(timelines.map(t => t.id === activeTimelineId ? {
      ...t,
      clientInfo: newInfo
    } : t));
  };

  const activeTimeline = timelines.find(t => t.id === activeTimelineId);

  return (
    <>
      <button 
        onClick={toggleTheme} 
        className="fixed top-5 right-5 w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg z-50 transition-transform hover:scale-110"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
      </button>

      <main className="min-h-screen flex flex-col items-center justify-start p-4 pt-12 bg-background transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: 'easeOut' }} 
          className='w-full max-w-7xl'
        >
          <h1 className='text-4xl md:text-5xl font-bold text-center mb-8 bg-gradient-primary bg-clip-text text-transparent'>
            Linha de Cobrança Interativa
          </h1>

          <div className="space-y-6">
            {timelines.map(timeline => (
              <motion.div
                key={timeline.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-xl p-6 shadow-lg"
              >
                <Timeline 
                  timeline={timeline}
                  updateEvents={(events) => {
                    setTimelines(timelines.map(t => t.id === timeline.id ? {
                      ...t,
                      events
                    } : t));
                  }}
                  updateClientInfo={(info) => {
                    setTimelines(timelines.map(t => t.id === timeline.id ? {
                      ...t,
                      clientInfo: info
                    } : t));
                  }}
                  onDelete={timelines.length > 1 ? () => {
                    if (window.confirm('Tem certeza que deseja excluir esta linha de cobrança?')) {
                      setTimelines(timelines.filter(t => t.id !== timeline.id));
                      if (activeTimelineId === timeline.id && timelines.length > 1) {
                        setActiveTimelineId(timelines[0].id === timeline.id ? timelines[1].id : timelines[0].id);
                      }
                    }
                  } : undefined}
                />
              </motion.div>
            ))}

            <motion.button
              onClick={handleAddTimeline}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={24} />
              Adicionar Novo Cliente
            </motion.button>
          </div>
        </motion.div>
      </main>
    </>
  );
};

export default Index;
