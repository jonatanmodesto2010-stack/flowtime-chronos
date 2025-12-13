import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
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
      const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

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

      // Buscar eventos do mês
      const { data: eventsData } = await supabaseClient
        .from('timeline_events')
        .select('id, event_date, line_id')
        .in('line_id', lineIds)
        .gte('event_date', monthStart)
        .lte('event_date', monthEnd);

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

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.event_date === dayStr);
  };

  const days = getDaysInMonth();
  const today = new Date();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={previousMonth}>
            <ChevronLeft size={14} />
          </Button>
          <CardTitle className="text-sm font-medium capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextMonth}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center font-medium py-1">{d}</div>
          ))}
        </div>
        
        {/* Grid de dias */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, today);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={index}
                className={cn(
                  "relative h-7 w-7 flex items-center justify-center text-xs rounded-md transition-colors",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentMonth && "text-foreground",
                  isToday && "bg-primary text-primary-foreground font-bold",
                  hasEvents && !isToday && "bg-accent/50 font-medium",
                  "hover:bg-accent cursor-pointer"
                )}
              >
                {format(day, 'd')}
                {hasEvents && (
                  <span className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
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
