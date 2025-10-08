import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Timeline } from '@/components/Timeline';
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
    }
  };

  const updateLine = async (timelineId: string, lineId: string, events: Event[]) => {
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

      if (user) loadTimelines(user.id);
    } catch (error: any) {
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
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir linha',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateClientInfo = async (timelineId: string, info: ClientInfo) => {
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

      if (user) loadTimelines(user.id);
    } catch (error: any) {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-2">Carregando...</div>
          <div className="text-muted-foreground">Buscando suas timelines</div>
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
                    updateClientInfo={(info) => updateClientInfo(timeline.id, info)}
                    onDelete={timelines.length > 1 ? () => handleDeleteTimeline(timeline.id) : undefined}
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
