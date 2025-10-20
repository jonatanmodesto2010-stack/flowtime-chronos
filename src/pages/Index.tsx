import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { Timeline } from '@/components/Timeline';
import { TimelineSkeleton } from '@/components/TimelineSkeleton';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
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
  clientId?: string;
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
  organization_id?: string;
  clientInfo: ClientInfo;
  lines: TimelineLine[];
}

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timelines, setTimelines] = useState<TimelineData[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { organizationId } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper function to check if a date string matches today
  const isToday = (dateString: string): boolean => {
    if (!dateString || dateString === '--/--') return false;
    
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    return dateString === todayStr;
  };

  // Helper function to check if a timeline has events scheduled for today
  const hasEventsToday = (timeline: TimelineData): boolean => {
    return timeline.lines.some(line => 
      line.events.some(event => isToday(event.date))
    );
  };


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (organizationId) {
      loadTimelines();
    }
  }, [organizationId]);

  const loadTimelines = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const { data: clientTimelines, error } = await supabaseClient
        .from('client_timelines')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
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
              organization_id: ct.organization_id,
              clientInfo: {
                clientId: ct.client_id || undefined,
                name: ct.client_name,
                startDate: ct.start_date,
                boletoValue: ct.boleto_value ? ct.boleto_value.toString() : '',
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


  const handleAddTimeline = async () => {
    if (!user) return;

    setOperationLoading(prev => ({ ...prev, addTimeline: true }));
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: newTimeline, error: timelineError } = await supabaseClient
        .from('client_timelines')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          // client_id será auto-gerado pelo trigger
          client_name: '',
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

      loadTimelines();

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
      loadTimelines();
      
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
      
      if (timeline && timeline.lines.length >= 10) {
        toast({
          title: 'Limite atingido',
          description: 'Você atingiu o máximo de 10 linhas permitidas por cliente.',
          variant: 'destructive',
        });
        return;
      }
      
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

      loadTimelines();

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

      loadTimelines();

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
          client_id: info.clientId || null,
          client_name: info.name,
          start_date: info.startDate,
          boleto_value: info.boletoValue === '' ? 0 : parseFloat(info.boletoValue),
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
      loadTimelines();
      
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTimeline = async (timelineId: string) => {
    if (!window.confirm('Deseja finalizar esta cobrança?\n\nEla será movida para o histórico e não poderá ser editada.')) return;

    try {
      const { error } = await supabaseClient
        .from('client_timelines')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', timelineId);

      if (error) throw error;

      loadTimelines();

      toast({
        title: 'Cobrança finalizada',
        description: 'Timeline movida para o histórico com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao finalizar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <div className="flex flex-1 w-full">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
        <main className="flex-1 p-6 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-6"
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
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex flex-1 w-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 p-6 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
          >
            <Tabs defaultValue="geral" className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList>
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="filtros">Filtros</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
                    />
                  </div>
                </div>
              </div>

              <TabsContent value="geral" className="space-y-6">
                {timelines
                  .filter((timeline) =>
                    timeline.clientInfo.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .sort((a, b) => {
                    const aHasToday = hasEventsToday(a);
                    const bHasToday = hasEventsToday(b);
                    
                    // Clients with events today come first
                    if (aHasToday && !bHasToday) return -1;
                    if (!aHasToday && bHasToday) return 1;
                    return 0;
                  })
                  .map((timeline, index) => (
                  <motion.div
                    key={timeline.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                    className={`bg-card border rounded-lg p-4 ${
                      hasEventsToday(timeline) 
                        ? 'border-green-500 border-2 shadow-lg shadow-green-500/20' 
                        : 'border-border'
                    }`}
                  >
                    <Timeline 
                      timeline={timeline}
                      updateLine={(lineId, events) => updateLine(timeline.id, lineId, events)}
                      addNewLine={() => addNewLine(timeline.id)}
                      deleteLine={(lineId) => deleteLine(timeline.id, lineId)}
                      updateClientInfo={(info) => updateClientInfo(timeline.id, info)}
                      onComplete={timelines.length > 1 ? () => handleCompleteTimeline(timeline.id) : undefined}
                      readOnly={false}
                    />
                  </motion.div>
                ))}
              </TabsContent>

              <TabsContent value="filtros" className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6">Filtros</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                      >
                        <option value="all">Todos</option>
                        <option value="created">Criado</option>
                        <option value="resolved">Resolvido</option>
                        <option value="no_response">Sem resposta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Período</label>
                      <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                      >
                        <option value="all">Todos</option>
                        <option value="today">Hoje</option>
                        <option value="week">Esta semana</option>
                        <option value="month">Este mês</option>
                      </select>
                    </div>

                    <div className="pt-4">
                      <p className="text-sm text-muted-foreground">
                        Filtros ativos: <span className="font-medium">{statusFilter !== 'all' || dateFilter !== 'all' ? 'Sim' : 'Nenhum'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6">Analytics</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Total de Clientes</p>
                      <p className="text-3xl font-bold">{timelines.length}</p>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Total de Eventos</p>
                      <p className="text-3xl font-bold">
                        {timelines.reduce((acc, t) => 
                          acc + t.lines.reduce((lineAcc, line) => lineAcc + line.events.length, 0), 0
                        )}
                      </p>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Eventos Resolvidos</p>
                      <p className="text-3xl font-bold">
                        {timelines.reduce((acc, t) => 
                          acc + t.lines.reduce((lineAcc, line) => 
                            lineAcc + line.events.filter(e => e.status === 'resolved').length, 0
                          ), 0
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Detalhamento por Cliente</h3>
                    {timelines.map(timeline => {
                      const totalEvents = timeline.lines.reduce((acc, line) => acc + line.events.length, 0);
                      const resolvedEvents = timeline.lines.reduce((acc, line) => 
                        acc + line.events.filter(e => e.status === 'resolved').length, 0
                      );
                      const percentage = totalEvents > 0 ? Math.round((resolvedEvents / totalEvents) * 100) : 0;
                      
                      return (
                        <div key={timeline.id} className="bg-muted/50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{timeline.clientInfo.name}</span>
                            <span className="text-sm text-muted-foreground">{percentage}% concluído</span>
                          </div>
                          <div className="w-full bg-background rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {resolvedEvents} de {totalEvents} eventos resolvidos
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Index;
