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

interface TimelineData {
  id: number;
  name: string;
  events: Event[];
}

const initialTimelinesData: TimelineData[] = [{
  id: 1,
  name: 'Cobrança Padrão',
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
  const [timelines, setTimelines] = useState<TimelineData[]>(initialTimelinesData);
  const [activeTimelineId, setActiveTimelineId] = useState(1);
  const [isAddingTimeline, setIsAddingTimeline] = useState(false);
  const [newTimelineName, setNewTimelineName] = useState('');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleAddTimeline = () => {
    if (newTimelineName.trim() === '') return;
    const newTimeline: TimelineData = {
      id: Date.now(),
      name: newTimelineName,
      events: []
    };
    setTimelines([...timelines, newTimeline]);
    setActiveTimelineId(newTimeline.id);
    setNewTimelineName('');
    setIsAddingTimeline(false);
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

  const updateTimelineName = (newName: string) => {
    setTimelines(timelines.map(t => t.id === activeTimelineId ? {
      ...t,
      name: newName
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
          className='w-full max-w-6xl'
        >
          <h1 className='text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-primary bg-clip-text text-transparent'>
            Time Line
          </h1>

          <nav className="flex items-center justify-center flex-wrap gap-2 mb-8" aria-label="Timeline navigation">
            {timelines.map(timeline => (
              <button 
                key={timeline.id} 
                onClick={() => setActiveTimelineId(timeline.id)} 
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeTimelineId === timeline.id 
                    ? 'bg-gradient-primary text-primary-foreground shadow-lg' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                aria-current={activeTimelineId === timeline.id ? 'page' : undefined}
              >
                {timeline.name}
                <AnimatePresence>
                  {timelines.length > 1 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0 }} 
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center cursor-pointer" 
                      onClick={e => handleDeleteTimeline(e, timeline.id)}
                      title="Excluir timeline"
                    >
                      <X size={12} className="text-destructive-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            ))}
            {isAddingTimeline ? (
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: 'auto' }} 
                className="flex items-center gap-2"
              >
                <input 
                  type="text" 
                  value={newTimelineName} 
                  onChange={e => setNewTimelineName(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAddTimeline()} 
                  placeholder="Nome da timeline" 
                  className="px-3 py-2 rounded-lg border bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus 
                />
                <button 
                  onClick={handleAddTimeline} 
                  className="px-3 py-2 bg-gradient-primary text-primary-foreground rounded-lg hover:scale-105 transition-transform"
                  aria-label="Confirmar nova timeline"
                >
                  <Plus size={20} />
                </button>
                <button 
                  onClick={() => setIsAddingTimeline(false)} 
                  className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  aria-label="Cancelar nova timeline"
                >
                  <X size={20} />
                </button>
              </motion.div>
            ) : (
              <button 
                onClick={() => setIsAddingTimeline(true)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                aria-label="Adicionar nova timeline"
              >
                <Plus size={20} />
              </button>
            )}
          </nav>

          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTimelineId} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }} 
              transition={{ duration: 0.3 }}
            >
              {activeTimeline ? (
                <Timeline 
                  key={activeTimeline.id} 
                  events={activeTimeline.events} 
                  updateEvents={updateEvents}
                  timelineName={activeTimeline.name}
                  onUpdateTimelineName={updateTimelineName}
                />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Nenhuma linha do tempo selecionada.</p>
                  <p>Crie uma nova para começar!</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>
    </>
  );
};

export default Index;
