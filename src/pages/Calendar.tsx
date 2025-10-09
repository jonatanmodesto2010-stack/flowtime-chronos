import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface Event {
  id: string;
  client_name: string;
  event_date: string;
  description: string | null;
  status: string;
  icon: string;
}

const Calendar = () => {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadEvents(session.user.id);
      } else {
        navigate('/auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadEvents(session.user.id);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadEvents = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data: timelines, error: timelinesError } = await supabaseClient
        .from('client_timelines')
        .select('id, client_name')
        .eq('user_id', userId);

      if (timelinesError) throw timelinesError;

      if (timelines && timelines.length > 0) {
        const timelineIds = timelines.map(t => t.id);
        
        const { data: lines, error: linesError } = await supabaseClient
          .from('timeline_lines')
          .select('id')
          .in('timeline_id', timelineIds);

        if (linesError) throw linesError;

        if (lines && lines.length > 0) {
          const lineIds = lines.map(l => l.id);
          
          const { data: eventsData, error: eventsError } = await supabaseClient
            .from('timeline_events')
            .select('*')
            .in('line_id', lineIds);

          if (eventsError) throw eventsError;

          // Map events with client names
          const eventsWithClients = (eventsData || []).map(event => {
            const line = lines.find(l => l.id === event.line_id);
            const timeline = timelines.find(t => 
              lines.some(l => l.id === event.line_id)
            );
            
            return {
              id: event.id,
              client_name: timeline?.client_name || 'Cliente',
              event_date: event.event_date,
              description: event.description,
              status: event.status,
              icon: event.icon,
            };
          });

          setEvents(eventsWithClients);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar eventos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${String(day).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    return events.filter(event => event.event_date === dateStr);
  };

  const hasNoResponseStatus = (clientName: string) => {
    return events.some(event => event.client_name === clientName && event.status === 'no_response');
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  if (loading) {
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
            <div className="max-w-6xl mx-auto">
              <div className="h-9 w-64 bg-muted animate-pulse rounded mb-6" />
              <div className="h-96 bg-muted animate-pulse rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

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
            className="max-w-6xl mx-auto"
          >
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Calendário de Eventos
              </h2>
              <p className="text-muted-foreground">
                Visualize todos os eventos das suas timelines
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  onClick={previousMonth}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft size={24} />
                </motion.button>
                
                <h3 className="text-2xl font-bold text-foreground">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                
                <motion.button
                  onClick={nextMonth}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight size={24} />
                </motion.button>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center font-semibold text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}
                
                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dayEvents = getEventsForDay(day);
                  const isToday = 
                    day === new Date().getDate() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear();

                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.01 }}
                      className={`aspect-square border rounded-lg p-2 ${
                        isToday 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border bg-card hover:bg-muted'
                      } transition-colors cursor-pointer`}
                    >
                      <div className={`text-sm font-semibold mb-1 ${
                        isToday ? 'text-primary' : 'text-foreground'
                      }`}>
                        {day}
                      </div>
                      
                      {dayEvents.length > 0 && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className="text-xs p-1 bg-primary/20 rounded truncate"
                              title={`${event.client_name}: ${event.description || ''}`}
                            >
                              <span className="mr-1">{event.icon}</span>
                              <span className={`font-medium ${
                                hasNoResponseStatus(event.client_name) 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : ''
                              }`}>
                                {event.client_name}
                              </span>
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayEvents.length - 2} mais
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Events Legend */}
            <div className="mt-6 bg-card border border-border rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <CalendarIcon size={20} />
                Status dos Eventos
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[hsl(var(--status-created))] rounded-full" />
                  <span className="text-sm text-muted-foreground">Criados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <span className="text-sm text-muted-foreground">Resolvidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚫</span>
                  <span className="text-sm text-muted-foreground">Sem Resposta</span>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Calendar;
