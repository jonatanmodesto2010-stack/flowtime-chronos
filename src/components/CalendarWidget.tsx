import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, CalendarDays, Grid3x3, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabaseClient } from '@/lib/supabase-client';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { ClientTimelineDialog } from '@/components/ClientTimelineDialog';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface CalendarEvent {
  id: string;
  event_date: string;
  event_time?: string;
  client_name: string;
  description: string | null;
  status: string;
  icon: string;
  timeline_id: string;
  timeline_status: string;
}

export const CalendarWidget = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month'>('week');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    client_name: string;
    start_date: string;
    is_active: boolean;
  } | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const shouldListenToChanges = useRef(true);
  const { organizationId } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    if (organizationId) {
      loadEvents();
    }
  }, [currentDate, organizationId]);

  // Real-time updates
  useEffect(() => {
    if (!organizationId) return;

    const eventsChannel = supabase
      .channel('calendar-widget-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events'
        },
        () => {
          if (shouldListenToChanges.current) {
            loadEvents();
          }
        }
      )
      .subscribe();

    const timelinesChannel = supabase
      .channel('calendar-widget-timelines')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_timelines'
        },
        () => {
          if (shouldListenToChanges.current) {
            loadEvents();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(timelinesChannel);
    };
  }, [organizationId]);

  const loadEvents = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);

      const { data: timelines } = await supabaseClient
        .from('client_timelines')
        .select('id, client_name, status')
        .eq('organization_id', organizationId);

      if (!timelines || timelines.length === 0) {
        setEvents([]);
        return;
      }

      const timelineIds = timelines.map(t => t.id);

      const { data: lines } = await supabaseClient
        .from('timeline_lines')
        .select('id, timeline_id')
        .in('timeline_id', timelineIds);

      if (!lines || lines.length === 0) {
        setEvents([]);
        return;
      }

      const lineIds = lines.map(l => l.id);

      const { data: eventsData } = await supabaseClient
        .from('timeline_events')
        .select('*')
        .in('line_id', lineIds);

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
          timeline_status: timeline?.status || 'active',
        };
      });

      setEvents(eventsWithClients);
    } catch (error) {
      console.error('Erro ao carregar eventos do calendário:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const previousWeek = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
  const nextWeek = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
  const goToToday = () => setCurrentDate(new Date());

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
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

  const getEventsForDay = (day: number, month?: number) => {
    const targetMonth = month !== undefined ? month : currentDate.getMonth() + 1;
    const dateStr = `${String(day).padStart(2, '0')}/${String(targetMonth).padStart(2, '0')}`;
    return events.filter(event => event.event_date === dateStr);
  };

  const isTimelineCompleted = (timelineStatus: string) => {
    return timelineStatus === 'completed' || timelineStatus === 'archived';
  };

  const handleOpenTimeline = async (timelineId: string) => {
    try {
      shouldListenToChanges.current = false;
      
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

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();
  const today = new Date();
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const filteredEvents = useMemo(() => events, [events]);

  return (
    <>
      <Card className="bg-card border-border flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-base font-semibold text-center">
            Calendário de Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* View Mode Buttons */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button
              variant={viewMode === 'today' ? 'default' : 'outline'}
              onClick={() => setViewMode('today')}
              size="sm"
              className="gap-1"
            >
              <Clock size={14} />
              Hoje
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              onClick={() => setViewMode('week')}
              size="sm"
              className="gap-1"
            >
              <CalendarDays size={14} />
              Semana
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              onClick={() => setViewMode('month')}
              size="sm"
              className="gap-1"
            >
              <Grid3x3 size={14} />
              Mês
            </Button>
          </div>

          {/* Navigation Header */}
          {viewMode !== 'today' && (
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={viewMode === 'month' ? previousMonth : previousWeek}
              >
                <ChevronLeft size={18} />
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <Button onClick={goToToday} variant="outline" size="sm" className="text-xs h-7">
                  Ir para Hoje
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={viewMode === 'month' ? nextMonth : nextWeek}
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          )}

          {/* Calendar Content */}
          <div className="flex-1 overflow-auto min-h-0">
            {viewMode === 'today' ? (
              /* Today View */
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-center mb-3">
                  {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                </h3>
                
                {(() => {
                  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;
                  const todayEvents = filteredEvents
                    .filter(event => event.event_date === todayStr)
                    .sort((a, b) => {
                      const aCompleted = isTimelineCompleted(a.timeline_status);
                      const bCompleted = isTimelineCompleted(b.timeline_status);
                      
                      if (aCompleted !== bCompleted) {
                        return aCompleted ? 1 : -1;
                      }
                      
                      if (!a.event_time) return 1;
                      if (!b.event_time) return -1;
                      return a.event_time.localeCompare(b.event_time);
                    });

                  if (todayEvents.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum evento hoje</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {todayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleOpenTimeline(event.timeline_id)}
                          className={cn(
                            "p-2 border-l-4 rounded-lg cursor-pointer transition-all hover:shadow-md",
                            isTimelineCompleted(event.timeline_status)
                              ? "bg-muted/50 opacity-70 grayscale"
                              : "bg-card"
                          )}
                          style={{
                            borderLeftColor: isTimelineCompleted(event.timeline_status)
                              ? '#9ca3af'
                              : event.status === 'created' ? 'hsl(var(--primary))' :
                                event.status === 'resolved' ? '#10b981' :
                                '#ef4444'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{event.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {event.event_time && (
                                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                    {event.event_time}
                                  </Badge>
                                )}
                                <span className={cn(
                                  "text-xs font-semibold truncate",
                                  isTimelineCompleted(event.timeline_status)
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                                )}>
                                  {event.client_name}
                                </span>
                              </div>
                              {event.description && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            {!isTimelineCompleted(event.timeline_status) && (
                              <Badge 
                                variant={
                                  event.status === 'resolved' ? 'default' :
                                  event.status === 'no_response' ? 'destructive' :
                                  'secondary'
                                }
                                className="text-[10px] h-5"
                              >
                                {event.status === 'created' && '📝'}
                                {event.status === 'resolved' && '✅'}
                                {event.status === 'no_response' && '🚫'}
                              </Badge>
                            )}
                            {isTimelineCompleted(event.timeline_status) && (
                              <Badge className="bg-gray-500/20 text-gray-500 text-[10px] h-5">
                                FIM
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : viewMode === 'week' ? (
              /* Week View */
              <div className="grid grid-cols-7 gap-1">
                {getWeekDays(currentDate).map((weekDay, index) => {
                  const day = weekDay.getDate();
                  const month = weekDay.getMonth();
                  const year = weekDay.getFullYear();
                  const dayEvents = getEventsForDay(day, month + 1);
                  const isToday = 
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();

                  return (
                    <div key={index} className="flex flex-col min-h-0">
                      <div className={cn(
                        "text-center py-1 rounded-lg mb-1",
                        isToday ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted'
                      )}>
                        <div className="text-[10px]">{dayNames[weekDay.getDay()]}</div>
                        <div className="text-sm font-semibold">{day}</div>
                      </div>
                      <div className="space-y-1 flex-1 overflow-auto max-h-[200px]">
                        {dayEvents.map(event => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => handleOpenTimeline(event.timeline_id)}
                            className={cn(
                              "p-1.5 border rounded text-[10px] cursor-pointer transition-colors",
                              isTimelineCompleted(event.timeline_status)
                                ? "bg-muted/50 border-gray-500/30 opacity-70 grayscale"
                                : "bg-card border-border hover:bg-muted"
                            )}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-sm">{event.icon}</span>
                              {event.event_time && (
                                <Badge variant="outline" className="text-[8px] h-4 px-1 bg-primary/10 text-primary border-primary/30">
                                  {event.event_time}
                                </Badge>
                              )}
                            </div>
                            <div className={cn(
                              "font-semibold truncate",
                              isTimelineCompleted(event.timeline_status)
                                ? "text-muted-foreground"
                                : "text-foreground"
                            )}>
                              {event.client_name}
                            </div>
                            {event.description && (
                              <p className="text-muted-foreground truncate">
                                {event.description}
                              </p>
                            )}
                            {!isTimelineCompleted(event.timeline_status) && (
                              <Badge 
                                variant={
                                  event.status === 'resolved' ? 'default' :
                                  event.status === 'no_response' ? 'destructive' :
                                  'secondary'
                                }
                                className="text-[8px] h-4 px-1 mt-0.5"
                              >
                                {event.status === 'created' && '📝'}
                                {event.status === 'resolved' && '✅'}
                                {event.status === 'no_response' && '🚫'}
                              </Badge>
                            )}
                            {isTimelineCompleted(event.timeline_status) && (
                              <Badge className="bg-gray-500/20 text-gray-500 text-[8px] h-4 px-1 mt-0.5">
                                FIM
                              </Badge>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Month View */
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {dayNames.map((d, i) => (
                    <div key={i} className="text-center font-semibold text-muted-foreground text-[10px] py-1">
                      {d}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  
                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const dayEvents = getEventsForDay(day);
                    const isCurrentDay = 
                      day === today.getDate() &&
                      currentDate.getMonth() === today.getMonth() &&
                      currentDate.getFullYear() === today.getFullYear();
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <div
                        key={day}
                        onClick={() => hasEvents && handleDayClick(day)}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center text-xs rounded-lg transition-colors",
                          hasEvents && "cursor-pointer hover:bg-accent",
                          isCurrentDay && "bg-primary text-primary-foreground font-bold",
                          hasEvents && !isCurrentDay && "font-medium"
                        )}
                      >
                        <span>{day}</span>
                        {hasEvents && (
                          <div className="flex gap-0.5 mt-0.5">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isCurrentDay ? "bg-primary-foreground" : "bg-primary"
                            )} />
                            {dayEvents.length > 1 && (
                              <span className="text-[8px] text-muted-foreground">
                                +{dayEvents.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Day Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Eventos do dia {selectedDay} de {monthNames[currentDate.getMonth()]}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-2 mt-4">
              {getEventsForDay(selectedDay).map(event => (
                <div
                  key={event.id}
                  onClick={() => handleOpenTimeline(event.timeline_id)}
                  className={cn(
                    "p-3 border rounded-lg transition-colors cursor-pointer",
                    isTimelineCompleted(event.timeline_status)
                      ? "bg-muted/50 border-gray-500/30 opacity-70 grayscale"
                      : "bg-card border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{event.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {event.event_time && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            {event.event_time}
                          </Badge>
                        )}
                        <span className={cn(
                          "font-semibold",
                          isTimelineCompleted(event.timeline_status)
                            ? "text-muted-foreground"
                            : "text-foreground"
                        )}>
                          {event.client_name}
                        </span>
                        {isTimelineCompleted(event.timeline_status) && (
                          <Badge className="bg-gray-500/20 text-gray-500">
                            FINALIZADO
                          </Badge>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                    </div>
                    {!isTimelineCompleted(event.timeline_status) && (
                      <Badge variant={
                        event.status === 'resolved' ? 'default' :
                        event.status === 'no_response' ? 'destructive' :
                        'secondary'
                      }>
                        {event.status === 'created' && '📝 Criado'}
                        {event.status === 'resolved' && '✅ Respondeu'}
                        {event.status === 'no_response' && '🚫 Não Respondeu'}
                      </Badge>
                    )}
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
            shouldListenToChanges.current = true;
            loadEvents();
          }}
        />
      )}
    </>
  );
};
