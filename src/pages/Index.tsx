import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Timeline } from '@/components/Timeline';
import { TimelineSkeleton } from '@/components/TimelineSkeleton';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface Event {
  id: string;
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
  id: string;
  events: Event[];
}

interface TimelineData {
  id: string;
  clientInfo: ClientInfo;
  lines: TimelineLine[];
}

const Index = () => {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timelines, setTimelines] = useState<TimelineData[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
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
        loadTimelines(session.user.id);
      } else {
        navigate('/auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadTimelines(session.user.id);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadTimelines = async (userId: string) => {
    try {
      setLoading(true);
      const { data: clientTimelines, error } = await supabaseClient
        .from('client_timelines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (clientTimelines && clientTimelines.length > 0) {
        const timelinesWithLines = await Promise.all(
          clientTimelines.map(async (ct: any) => {
            const { data: lines, error: linesError } = await supabaseClient
              .from('timeline_lines')
              .select('*')
              .eq('timeline_id', ct.id)
              .order('position', { ascending: true });

            if (linesError) throw linesError;

            const linesWithEvents = await Promise.all(
              (lines || []).map(async (line: any) => {
                const { data: events, error: eventsError } = await supabaseClient
                  .from('timeline_events')
                  .select('*')
                  .eq('line_id', line.id)
                  .order('event_order', { ascending: true });

                if (eventsError) throw eventsError;

                return {
                  id: line.id,
                  events: (events || []).map((e: any) => ({
                    id: e.id,
                    icon: e.icon,
                    iconSize: e.icon_size,
                    date: e.event_date,
                    description: e.description || '',
                    position: e.position as 'top' | 'bottom',
                    status: e.status as 'created' | 'resolved' | 'no_response',
                  })),
                };
              })
            );

            return {
              id: ct.id,
              clientInfo: {
                name: ct.client_name,
                startDate: ct.start_date,
                boletoValue: ct.boleto_value?.toString() || '0.00',
                dueDate: ct.due_date || ct.start_date,
              },
              lines: linesWithEvents,
            };
          })
        );

        setTimelines(timelinesWithLines);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar timelines',
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

  const handleAddTimeline = async () => {
    if (!user) return;

    setOperationLoading(prev => ({ ...prev, addTimeline: true }));
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: newTimeline, error: timelineError } = await supabaseClient
        .from('client_timelines')
        .insert({
          user_id: user.id,
          client_name: 'NOVO CLIENTE',
          start_date: today,
          boleto_value: 0,
          due_date: today,
        })
        .select()
        .single();

      if (timelineError) throw timelineError;
      if (!newTimeline) throw new Error('Falha ao criar timeline');

      const { data: newLine, error: lineError } = await supabaseClient
        .from('timeline_lines')
        .insert({
          timeline_id: newTimeline.id,
          position: 0,
        })
        .select()
        .single();

      if (lineError) throw lineError;
      if (!newLine) throw new Error('Falha ao criar linha');

      const { error: eventError } = await supabaseClient
        .from('timeline_events')
        .insert({
          line_id: newLine.id,
          event_date: '--/--',
          description: 'Novo evento',
          position: 'top',
          status: 'created',
          icon: '📋',
          icon_size: 'text-2xl',
          event_order: 0,
        });

      if (eventError) throw eventError;

      loadTimelines(user.id);

      toast({
        title: 'Cliente adicionado',
        description: 'Nova linha de cobrança criada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar cliente',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setOperationLoading(prev => ({ ...prev, addTimeline: false }));
    }
  };

  const updateLine = async (timelineId: string, lineId: string, events: Event[]) => {
    // Atualização otimista - atualiza o estado local imediatamente
    setTimelines(prevTimelines =>
      prevTimelines.map(timeline =>
        timeline.id === timelineId
          ? {
              ...timeline,
              lines: timeline.lines.map(line =>
                line.id === lineId ? { ...line, events } : line
              ),
            }
          : timeline
      )
    );

    try {
      const { error: deleteError } = await supabaseClient
        .from('timeline_events')
        .delete()
        .eq('line_id', lineId);

      if (deleteError) throw deleteError;

      const eventsToInsert = events.map((e, index) => ({
        line_id: lineId,
        event_date: e.date,
        description: e.description,
        position: e.position,
        status: e.status,
        icon: e.icon,
        icon_size: e.iconSize,
        event_order: index,
      }));

      const { error: insertError } = await supabaseClient
        .from('timeline_events')
        .insert(eventsToInsert);

      if (insertError) throw insertError;

      toast({
        title: 'Eventos atualizados',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch (error: any) {
      // Em caso de erro, recarrega os dados corretos
      if (user) loadTimelines(user.id);
      
      toast({
        title: 'Erro ao atualizar eventos',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addNewLine = async (timelineId: string) => {
    try {
      const timeline = timelines.find((t) => t.id === timelineId);
      const nextPosition = timeline ? timeline.lines.length : 0;

      const { data: newLine, error: lineError } = await supabaseClient
        .from('timeline_lines')
        .insert({
          timeline_id: timelineId,
          position: nextPosition,
        })
        .select()
        .single();

      if (lineError) throw lineError;
      if (!newLine) throw new Error('Falha ao criar linha');

      const { error: eventError } = await supabaseClient
        .from('timeline_events')
        .insert({
          line_id: newLine.id,
          event_date: '--/--',
          description: 'Novo evento',
          position: 'top',
          status: 'created',
          icon: '📋',
          icon_size: 'text-2xl',
          event_order: 0,
        });

      if (eventError) throw eventError;

      if (user) loadTimelines(user.id);

      toast({
        title: 'Linha adicionada',
        description: 'Nova linha criada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar linha',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteLine = async (timelineId: string, lineId: string) => {
    try {
      const { error } = await supabaseClient
        .from('timeline_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;

      if (user) loadTimelines(user.id);

      toast({
        title: 'Linha excluída',
        description: 'Linha removida com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir linha',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateClientInfo = async (timelineId: string, info: ClientInfo) => {
    // Atualização otimista
    setTimelines(prevTimelines =>
      prevTimelines.map(timeline =>
        timeline.id === timelineId
          ? { ...timeline, clientInfo: info }
          : timeline
      )
    );

    try {
      const { error } = await supabaseClient
        .from('client_timelines')
        .update({
          client_name: info.name,
          start_date: info.startDate,
          boleto_value: parseFloat(info.boletoValue),
          due_date: info.dueDate,
        })
        .eq('id', timelineId);

      if (error) throw error;

      toast({
        title: 'Cliente atualizado',
        description: 'Informações salvas com sucesso.',
      });
    } catch (error: any) {
      // Em caso de erro, recarrega os dados corretos
      if (user) loadTimelines(user.id);
      
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTimeline = async (timelineId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta linha de cobrança?')) return;

    try {
      const { error } = await supabaseClient
        .from('client_timelines')
        .delete()
        .eq('id', timelineId);

      if (error) throw error;

      if (user) loadTimelines(user.id);

      toast({
        title: 'Timeline excluída',
        description: 'Linha de cobrança removida com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir timeline',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-7xl mx-auto space-y-6"
          >
            <div className="mb-6">
              <div className="h-9 w-80 bg-muted animate-pulse rounded mb-2" />
              <div className="h-5 w-96 bg-muted animate-pulse rounded" />
            </div>
            
            <TimelineSkeleton />
            <TimelineSkeleton />
          </motion.div>
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
            transition={{ duration: 0.5 }} 
            className="max-w-7xl mx-auto"
          >
            <div className="space-y-6">
               {timelines.map((timeline, index) => (
                 <motion.div
                   key={timeline.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ 
                     duration: 0.3,
                     ease: "easeOut"
                   }}
                   className="bg-card border border-border rounded-lg p-4"
                 >
                    <Timeline 
                      timeline={timeline}
                      updateLine={(lineId, events) => updateLine(timeline.id, lineId, events)}
                      addNewLine={() => addNewLine(timeline.id)}
                      deleteLine={(lineId) => deleteLine(timeline.id, lineId)}
                      updateClientInfo={(info) => updateClientInfo(timeline.id, info)}
                      onDelete={timelines.length > 1 ? () => handleDeleteTimeline(timeline.id) : undefined}
                      readOnly={false}
                    />
                 </motion.div>
               ))}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Index;
