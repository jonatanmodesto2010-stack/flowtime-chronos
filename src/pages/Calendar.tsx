import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search, BarChart3, Grid3x3, CalendarDays } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [refreshKey, setRefreshKey] = useState(0);
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

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    // Canal para escutar mudanças em timeline_events
    const eventsChannel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events'
        },
        (payload) => {
          console.log('📅 Evento atualizado - Recarregando calendário...', payload);
          console.log('Payload específico:', payload.new || payload.old);
          loadEvents(user.id);
        }
      )
      .subscribe();

    // Canal para escutar mudanças em client_timelines
    const timelinesChannel = supabase
      .channel('calendar-timelines-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_timelines'
        },
        (payload) => {
          console.log('👤 Cliente atualizado - Recarregando calendário...', payload);
          console.log('Payload específico:', payload.new || payload.old);
          loadEvents(user.id);
        }
      )
      .subscribe();

    // Canal para escutar mudanças em timeline_lines
    const linesChannel = supabase
      .channel('calendar-lines-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_lines'
        },
        (payload) => {
          console.log('📊 Linha atualizada - Recarregando calendário...', payload);
          console.log('Payload específico:', payload.new || payload.old);
          loadEvents(user.id);
        }
      )
      .subscribe();

    // Cleanup: remover canais quando o componente desmontar
    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(timelinesChannel);
      supabase.removeChannel(linesChannel);
    };
  }, [user]);

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
          .select('id, timeline_id')
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
            const timeline = timelines.find(t => t.id === line?.timeline_id);
            
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
          setRefreshKey(prev => prev + 1);
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

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesClient = clientSearch === '' || 
        event.client_name.toLowerCase().includes(clientSearch.toLowerCase());
      return matchesStatus && matchesClient;
    });
  }, [events, statusFilter, clientSearch, refreshKey]);

  const getEventsForDay = (day: number) => {
    const dateStr = `${String(day).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    return filteredEvents.filter(event => event.event_date === dateStr);
  };

  const monthlyStats = useMemo(() => {
    const stats = {
      total: filteredEvents.length,
      created: 0,
      resolved: 0,
      no_response: 0,
    };
    
    filteredEvents.forEach(event => {
      if (event.status === 'created') stats.created++;
      else if (event.status === 'resolved') stats.resolved++;
      else if (event.status === 'no_response') stats.no_response++;
    });
    
    return stats;
  }, [filteredEvents]);

  const hasNoResponseStatus = (clientName: string) => {
    return events.some(event => event.client_name === clientName && event.status === 'no_response');
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      weekDays.push(weekDay);
    }
    return weekDays;
  };

  const previousWeek = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
  };

  const nextWeek = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
  };

  const handleEventClick = (clientName: string) => {
    navigate('/clients', { state: { searchQuery: clientName } });
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  const getStatusCounts = (dayEvents: Event[]) => {
    const counts = {
      created: 0,
      resolved: 0,
      no_response: 0,
    };
    
    dayEvents.forEach(event => {
      if (event.status === 'created') counts.created++;
      else if (event.status === 'resolved') counts.resolved++;
      else if (event.status === 'no_response') counts.no_response++;
    });
    
    return counts;
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

            {/* Monthly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 size={16} />
                    Total de Eventos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{monthlyStats.total}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    📝 Criados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{monthlyStats.created}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    ✅ Resolvidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{monthlyStats.resolved}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    🚫 Sem Resposta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{monthlyStats.no_response}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-lg">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder="Buscar por cliente..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="created">📝 Criados</SelectItem>
                      <SelectItem value="resolved">✅ Resolvidos</SelectItem>
                      <SelectItem value="no_response">🚫 Sem Resposta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  onClick={viewMode === 'month' ? previousMonth : previousWeek}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft size={24} />
                </motion.button>
                
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-foreground">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <Button onClick={goToToday} variant="outline" size="sm">
                    Hoje
                  </Button>
                  <div className="flex gap-1 border border-border rounded-lg p-1">
                    <Button
                      onClick={() => setViewMode('month')}
                      variant={viewMode === 'month' ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <Grid3x3 size={16} />
                      Mês
                    </Button>
                    <Button
                      onClick={() => setViewMode('week')}
                      variant={viewMode === 'week' ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <CalendarDays size={16} />
                      Semana
                    </Button>
                  </div>
                </div>
                
                <motion.button
                  onClick={viewMode === 'month' ? nextMonth : nextWeek}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight size={24} />
                </motion.button>
              </div>

              {viewMode === 'month' ? (
                <>
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
                      const statusCounts = getStatusCounts(dayEvents);
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
                          onClick={() => dayEvents.length > 0 && handleDayClick(day)}
                          className={`aspect-square border rounded-lg p-2 ${
                            isToday 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border bg-card hover:bg-muted'
                          } transition-colors ${dayEvents.length > 0 ? 'cursor-pointer' : ''}`}
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
                              
                              {/* Status indicators */}
                              <div className="flex gap-1 mt-1">
                                {statusCounts.created > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    📝 {statusCounts.created}
                                  </Badge>
                                )}
                                {statusCounts.resolved > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    ✅ {statusCounts.resolved}
                                  </Badge>
                                )}
                                {statusCounts.no_response > 0 && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                    🚫 {statusCounts.no_response}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Week View */
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2">
                    {getWeekDays(currentDate).map((weekDay, index) => {
                      const day = weekDay.getDate();
                      const month = weekDay.getMonth();
                      const year = weekDay.getFullYear();
                      const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
                      const dayEvents = filteredEvents.filter(event => event.event_date === dateStr);
                      const isToday = 
                        day === new Date().getDate() &&
                        month === new Date().getMonth() &&
                        year === new Date().getFullYear();

                      return (
                        <div key={index} className="space-y-2">
                          <div className={`text-center p-2 rounded-lg ${
                            isToday ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted'
                          }`}>
                            <div className="text-xs">{dayNames[weekDay.getDay()]}</div>
                            <div className="text-lg">{day}</div>
                          </div>
                          <div className="space-y-2 min-h-[200px]">
                            {dayEvents.map(event => (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleEventClick(event.client_name)}
                                className="p-2 border border-border rounded-lg bg-card hover:bg-muted transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{event.icon}</span>
                                  <span className={`text-xs font-semibold truncate ${
                                    hasNoResponseStatus(event.client_name)
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-foreground'
                                  }`}>
                                    {event.client_name}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                    {event.description}
                                  </p>
                                )}
                                <Badge 
                                  variant={
                                    event.status === 'resolved' 
                                      ? 'default' 
                                      : event.status === 'no_response'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="text-[10px] h-4"
                                >
                                  {event.status === 'created' && '📝'}
                                  {event.status === 'resolved' && '✅'}
                                  {event.status === 'no_response' && '🚫'}
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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

          {/* Day Details Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>
                  Eventos do dia {selectedDay} de {monthNames[currentDate.getMonth()]}
                </DialogTitle>
              </DialogHeader>
              
              {selectedDay && (
                <div className="space-y-3 mt-4">
                  {getEventsForDay(selectedDay).map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event.client_name)}
                      className="p-4 border border-border rounded-lg bg-card hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{event.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`font-semibold ${
                              hasNoResponseStatus(event.client_name)
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-foreground'
                            }`}>
                              {event.client_name}
                            </h4>
                            <Badge variant={
                              event.status === 'resolved' 
                                ? 'default' 
                                : event.status === 'no_response'
                                ? 'destructive'
                                : 'secondary'
                            }>
                              {event.status === 'created' && '📝 Criado'}
                              {event.status === 'resolved' && '✅ Resolvido'}
                              {event.status === 'no_response' && '🚫 Sem Resposta'}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground italic">
                            Clique para ver a timeline do cliente
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default Calendar;
