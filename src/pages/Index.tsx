import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Timeline } from '@/components/Timeline';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

interface Event {
  id: number;
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
  id: number;
  events: Event[];
}

interface TimelineData {
  id: number;
  clientInfo: ClientInfo;
  lines: TimelineLine[];
}

const initialTimelinesData: TimelineData[] = [{
  id: 1,
  clientInfo: {
    name: 'Cliente Exemplo',
    startDate: '2024-08-10',
    boletoValue: '150.00',
    dueDate: '2024-08-25'
  },
  lines: [{
    id: 1,
    events: [{
      id: 1,
      icon: '💬',
      iconSize: 'text-2xl',
      date: '10/08',
      description: 'Cobrei o cliente e sem resposta.',
      position: 'top',
      status: 'created'
    }, {
      id: 2,
      icon: '📅',
      iconSize: 'text-2xl',
      date: '11/08',
      description: 'Cliente pediu o boleto.',
      position: 'bottom',
      status: 'resolved'
    }, {
      id: 3,
      icon: '📄',
      iconSize: 'text-2xl',
      date: '15/08',
      description: 'Enviei o boleto para o cliente.',
      position: 'top',
      status: 'created'
    }]
  }]
}];

// Função para migrar dados antigos para nova estrutura
const migrateOldData = (data: any[]): TimelineData[] => {
  return data.map(item => {
    // Se já tem a nova estrutura (lines), retorna como está
    if (item.lines && Array.isArray(item.lines)) {
      return item as TimelineData;
    }
    
    // Se tem a estrutura antiga (events direto no timeline), converte
    if (item.events && Array.isArray(item.events)) {
      return {
        id: item.id,
        clientInfo: item.clientInfo || {
          name: item.name || 'Cliente',
          startDate: new Date().toISOString().split('T')[0],
          boletoValue: '0.00',
          dueDate: new Date().toISOString().split('T')[0]
        },
        lines: [{
          id: Date.now() + Math.random(),
          events: item.events
        }]
      };
    }
    
    // Se não tem nem events nem lines, cria estrutura vazia
    return {
      id: item.id,
      clientInfo: item.clientInfo || {
        name: 'Cliente',
        startDate: new Date().toISOString().split('T')[0],
        boletoValue: '0.00',
        dueDate: new Date().toISOString().split('T')[0]
      },
      lines: [{
        id: Date.now() + Math.random(),
        events: []
      }]
    };
  });
};

const Index = () => {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timelines, setTimelines] = useState<TimelineData[]>(() => {
    const saved = localStorage.getItem('timelines');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return migrateOldData(parsed);
      } catch (e) {
        console.error('Erro ao carregar dados salvos:', e);
        return initialTimelinesData;
      }
    }
    return initialTimelinesData;
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
      lines: [{
        id: Date.now() + 1,
        events: [{
          id: Date.now() + 2,
          icon: '📋',
          iconSize: 'text-2xl',
          date: '--/--',
          description: 'Novo evento',
          position: 'top',
          status: 'created'
        }]
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

  const updateLine = (timelineId: number, lineId: number, updatedEvents: Event[]) => {
    setTimelines(timelines.map(t => t.id === timelineId ? {
      ...t,
      lines: t.lines.map(line => line.id === lineId ? {
        ...line,
        events: updatedEvents
      } : line)
    } : t));
  };

  const addNewLine = (timelineId: number) => {
    setTimelines(timelines.map(t => t.id === timelineId ? {
      ...t,
      lines: [...t.lines, {
        id: Date.now(),
        events: [{
          id: Date.now() + 1,
          icon: '📋',
          iconSize: 'text-2xl',
          date: '--/--',
          description: 'Novo evento',
          position: 'top',
          status: 'created'
        }]
      }]
    } : t));
  };

  const deleteLine = (timelineId: number, lineId: number) => {
    setTimelines(timelines.map(t => t.id === timelineId ? {
      ...t,
      lines: t.lines.filter(line => line.id !== lineId)
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
    <div className="min-h-screen flex flex-col w-full bg-background">
      <Header 
        theme={theme} 
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex flex-1 w-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 p-6 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }} 
            className="max-w-7xl mx-auto"
          >
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Dashboard de Ocorrências
              </h2>
              <p className="text-muted-foreground">
                Gerencie todas as timelines de atendimento e ocorrências técnicas
              </p>
            </div>

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
                    updateLine={(lineId, events) => updateLine(timeline.id, lineId, events)}
                    addNewLine={() => addNewLine(timeline.id)}
                    deleteLine={(lineId) => deleteLine(timeline.id, lineId)}
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
                className="w-full py-4 bg-gradient-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Plus size={24} />
                Adicionar Novo Cliente
              </motion.button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Index;
