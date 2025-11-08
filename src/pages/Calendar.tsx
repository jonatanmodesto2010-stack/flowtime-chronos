import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search, BarChart3, Grid3x3, CalendarDays, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { ClientTimelineDialog } from '@/components/ClientTimelineDialog';
import { useRef } from 'react';

interface Event {
  id: string;
  client_name: string;
  event_date: string;
  event_time?: string;
  description: string | null;
  status: string;
  icon: string;
  timeline_id: string;
}

const Calendar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [iconsFilter, setIconsFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'today' | 'month' | 'week'>('month');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    client_name: string;
    start_date: string;
    is_active: boolean;
  } | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const shouldListenToChanges = useRef(true);
  const navigate = useNavigate();
  const { toast } = useToast();


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
          if (shouldListenToChanges.current) {
            loadEvents(user.id);
          }
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
          if (shouldListenToChanges.current) {
            loadEvents(user.id);
          }
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
          if (shouldListenToChanges.current) {
            loadEvents(user.id);
          }
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
      
      console.log('🔄 Carregando eventos para userId:', userId);
      
      // Buscar timelines pela organização ao invés de user_id
      const { data: userRoles } = await supabaseClient
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', userId)
        .single();
      
      if (!userRoles?.organization_id) {
        console.error('❌ Usuário sem organização');
        setLoading(false);
        return;
      }
      
      console.log('🏢 Organization ID:', userRoles.organization_id);
      
      const { data: timelines, error: timelinesError } = await supabaseClient
        .from('client_timelines')
        .select('id, client_name')
        .eq('organization_id', userRoles.organization_id);

      if (timelinesError) throw timelinesError;
      
      console.log('📋 Timelines encontradas:', timelines?.length || 0);

      if (timelines && timelines.length > 0) {
        const timelineIds = timelines.map(t => t.id);
        
        const { data: lines, error: linesError } = await supabaseClient
          .from('timeline_lines')
          .select('id, timeline_id')
          .in('timeline_id', timelineIds);

        if (linesError) throw linesError;
        
        console.log('📊 Lines encontradas:', lines?.length || 0);

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
              event_time: event.event_time,
              description: event.description,
              status: event.status,
              icon: event.icon,
              timeline_id: line?.timeline_id || '',
            };
          });

          console.log('📊 Eventos carregados:', {
            total: eventsWithClients.length,
            eventos: eventsWithClients.map(e => ({
              client: e.client_name,
              date: e.event_date,
              status: e.status
            }))
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
      const matchesIcon = iconsFilter.length === 0 || iconsFilter.includes(event.icon);
      return matchesStatus && matchesClient && matchesIcon;
    });
  }, [events, statusFilter, clientSearch, iconsFilter, refreshKey]);

  const getEventsForDay = (day: number, month?: number) => {
    const targetMonth = month !== undefined ? month : currentDate.getMonth() + 1;
    const dateStr = `${String(day).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}`;
    const dayEvents = filteredEvents.filter(event => event.event_date === dateStr);
    
    console.log(`🔍 Buscando eventos para dia ${day}/${targetMonth}:`, {
      dateStr,
      totalFilteredEvents: filteredEvents.length,
      eventsFound: dayEvents.length,
      eventos: dayEvents.map(e => ({ client: e.client_name, date: e.event_date, status: e.status }))
    });
    
    return dayEvents;
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

  const handleOpenTimeline = async (timelineId: string, clientName: string) => {
    try {
      // Desabilitar listeners enquanto modal está aberto
      shouldListenToChanges.current = false;
      
      // Buscar dados completos do cliente
      const { data: clientData, error } = await supabaseClient
        .from('client_timelines')
        .select('*')
        .eq('id', timelineId)
        .single();

      if (error) throw error;

      if (clientData) {
        setSelectedClient(clientData);
        setIsTimelineModalOpen(true);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao abrir timeline',
        description: error.message,
        variant: 'destructive',
      });
    }
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
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">
              <div className="max-w-6xl mx-auto">
                <div className="h-9 w-64 bg-muted animate-pulse rounded mb-6" />
                <div className="h-96 bg-muted animate-pulse rounded-xl" />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
        
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
                    ✅ Respondeu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{monthlyStats.resolved}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    🚫 Não Respondeu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{monthlyStats.no_response}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-lg">
              <div className="flex flex-col gap-4">
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
                        <SelectItem value="resolved">✅ Respondeu</SelectItem>
                        <SelectItem value="no_response">🚫 Não Respondeu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Icons Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">Filtrar por ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {['💬', '📅', '📄', '📞', '✅', '🤝', '⚠️', '🧰'].map(icon => (
                      <button
                        key={icon}
                        onClick={() => {
                          setIconsFilter(prev => 
                            prev.includes(icon) 
                              ? prev.filter(i => i !== icon) 
                              : [...prev, icon]
                          );
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110 ${
                          iconsFilter.includes(icon)
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
              {/* View Mode Buttons */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <Button
                  variant={viewMode === 'today' ? 'default' : 'outline'}
                  onClick={() => setViewMode('today')}
                  size="lg"
                  className="min-w-[120px] gap-2"
                >
                  <Clock size={18} />
                  Hoje
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'outline'}
                  onClick={() => setViewMode('week')}
                  size="lg"
                  className="min-w-[120px] gap-2"
                >
                  <CalendarDays size={18} />
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  onClick={() => setViewMode('month')}
                  size="lg"
                  className="min-w-[120px] gap-2"
                >
                  <Grid3x3 size={18} />
                  Mês
                </Button>
              </div>

              {/* Calendar Header for Month/Week views */}
              {viewMode !== 'today' && (
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
                      Ir para Hoje
                    </Button>
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
              )}

              {viewMode === 'today' ? (
                /* Today View */
                <motion.div
                  key="today-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
                    Eventos de Hoje - {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                  </h2>
                  
                  {(() => {
                    const today = new Date();
                    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;
                    const todayEvents = filteredEvents
                      .filter(event => event.event_date === todayStr)
                      .sort((a, b) => {
                        if (!a.event_time) return 1;
                        if (!b.event_time) return -1;
                        return a.event_time.localeCompare(b.event_time);
                      });

                    if (todayEvents.length === 0) {
                      return (
                        <div className="text-center py-16 text-muted-foreground">
                          <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                          <p className="text-lg">Nenhum evento para hoje</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-w-3xl mx-auto">
                        {todayEvents.map((event, idx) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => handleOpenTimeline(event.timeline_id, event.client_name)}
                            className="p-5 border-l-4 rounded-lg cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-card border-border"
                            style={{
                              borderLeftColor: 
                                event.status === 'created' ? 'hsl(var(--primary))' :
                                event.status === 'resolved' ? '#10b981' :
                                '#ef4444'
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-4xl">{event.icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {event.event_time && (
                                    <span className="text-lg font-bold text-primary flex items-center gap-1">
                                      <Clock size={16} />
                                      {event.event_time}
                                    </span>
                                  )}
                                  <span className="text-lg font-semibold text-foreground">
                                    {event.client_name}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              <Badge variant={
                                event.status === 'resolved' ? 'default' :
                                event.status === 'no_response' ? 'destructive' :
                                'secondary'
                              }>
                                {event.status === 'created' && '📝 Criado'}
                                {event.status === 'resolved' && '✅ Respondeu'}
                                {event.status === 'no_response' && '🚫 Não Respondeu'}
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })()}
                </motion.div>
              ) : viewMode === 'month' ? (
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
                                  title={`${event.event_time ? event.event_time + ' - ' : ''}${event.client_name}: ${event.description || ''}`}
                                >
                                  <span className="mr-1">{event.icon}</span>
                                  {event.event_time && <span className="font-semibold">{event.event_time} </span>}
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
                      const dayEvents = getEventsForDay(day, month + 1);
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
                                onClick={() => handleOpenTimeline(event.timeline_id, event.client_name)}
                                className="p-2 border border-border rounded-lg bg-card hover:bg-muted transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{event.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    {event.event_time && (
                                      <div className="text-xs font-bold text-primary mb-0.5">
                                        {event.event_time}
                                      </div>
                                    )}
                                    <span className={`text-xs font-semibold truncate block ${
                                      hasNoResponseStatus(event.client_name)
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-foreground'
                                    }`}>
                                      {event.client_name}
                                    </span>
                                  </div>
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
                  <span className="text-sm text-muted-foreground">Respondeu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚫</span>
                  <span className="text-sm text-muted-foreground">Não Respondeu</span>
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
                        onClick={() => handleOpenTimeline(event.timeline_id, event.client_name)}
                        className="p-4 border border-border rounded-lg bg-card hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{event.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                {event.event_time && (
                                  <div className="text-sm font-bold text-primary mb-1 flex items-center gap-1">
                                    <Clock size={14} />
                                    {event.event_time}
                                  </div>
                                )}
                                <h4 className={`font-semibold ${
                                  hasNoResponseStatus(event.client_name)
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-foreground'
                                }`}>
                                  {event.client_name}
                                </h4>
                              </div>
                              <Badge variant={
                                event.status === 'resolved' 
                                  ? 'default' 
                                  : event.status === 'no_response'
                                  ? 'destructive'
                                  : 'secondary'
                              }>
                                {event.status === 'created' && '📝 Criado'}
                                {event.status === 'resolved' && '✅ Respondeu'}
                                {event.status === 'no_response' && '🚫 Não Respondeu'}
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

          {/* Timeline Modal */}
          {selectedClient && (
            <ClientTimelineDialog
              client={selectedClient}
              isOpen={isTimelineModalOpen}
              onClose={() => {
                setIsTimelineModalOpen(false);
                setSelectedClient(null);
                // Reabilitar listeners e recarregar dados uma vez
                shouldListenToChanges.current = true;
                if (user) {
                  loadEvents(user.id);
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  </SidebarProvider>
  );
};

export default Calendar;
