import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase-client';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  event_date: string;
  timeline_id: string;
}

export const CalendarWidget = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useUserRole();

  useEffect(() => {
    if (organizationId) {
      loadMonthEvents();
    }
  }, [currentDate, organizationId]);

  const loadMonthEvents = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);

      // Buscar timelines da organização
      const { data: timelines } = await supabaseClient
        .from('client_timelines')
        .select('id')
        .eq('organization_id', organizationId);

      if (!timelines || timelines.length === 0) {
        setEvents([]);
        return;
      }

      const timelineIds = timelines.map(t => t.id);

      // Buscar linhas dessas timelines
      const { data: lines } = await supabaseClient
        .from('timeline_lines')
        .select('id, timeline_id')
        .in('timeline_id', timelineIds);

      if (!lines || lines.length === 0) {
        setEvents([]);
        return;
      }

      const lineIds = lines.map(l => l.id);

      // Buscar todos os eventos
      const { data: eventsData } = await supabaseClient
        .from('timeline_events')
        .select('id, event_date, line_id')
        .in('line_id', lineIds);

      // Mapear eventos com timeline_id
      const mappedEvents = (eventsData || []).map(event => {
        const line = lines.find(l => l.id === event.line_id);
        return {
          id: event.id,
          event_date: event.event_date,
          timeline_id: line?.timeline_id || ''
        };
      });

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Erro ao carregar eventos do calendário:', error);
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${String(day).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    return events.filter(e => e.event_date === dateStr);
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();
  const today = new Date();
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previousMonth}>
            <ChevronLeft size={18} />
          </Button>
          <CardTitle className="text-base font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d, i) => (
            <div key={i} className="text-center font-semibold text-muted-foreground text-xs py-2">
              {d}
            </div>
          ))}
        </div>
        
        {/* Grid de dias */}
        <div className="grid grid-cols-7 gap-1">
          {/* Células vazias para dias antes do início do mês */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}
          
          {/* Dias do mês */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayEvents = getEventsForDay(day);
            const isToday = 
              day === today.getDate() &&
              currentDate.getMonth() === today.getMonth() &&
              currentDate.getFullYear() === today.getFullYear();
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={day}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-colors cursor-pointer hover:bg-accent",
                  isToday && "bg-primary text-primary-foreground font-bold",
                  hasEvents && !isToday && "font-medium"
                )}
              >
                <span>{day}</span>
                {hasEvents && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full mt-0.5",
                    isToday ? "bg-primary-foreground" : "bg-primary"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
