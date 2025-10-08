import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Calendar, List } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ClientTimeline } from '@/components/ClientTimeline';
import { Timeline } from '@/components/Timeline';
import { TimelineSkeleton } from '@/components/TimelineSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { clientInfoSchema } from '@/lib/validations';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';

interface Client {
  id: string;
  client_name: string;
  start_date: string;
  boleto_value: number | null;
  due_date: string | null;
  created_at: string;
}

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

const Clients = () => {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useUserRole();
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [managingClientId, setManagingClientId] = useState<string | null>(null);
  const [managingClientName, setManagingClientName] = useState<string>('');
  const [formData, setFormData] = useState({
    client_name: '',
    start_date: new Date().toISOString().split('T')[0],
    boleto_value: '0.00',
    due_date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Estados para Timelines (da página Index)
  const [timelines, setTimelines] = useState<TimelineData[]>([]);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
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
      loadClients();
      loadTimelines();
    }
  }, [organizationId]);

  const loadClients = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('client_timelines')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
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

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        client_name: client.client_name,
        start_date: client.start_date,
        boleto_value: client.boleto_value?.toString() || '0.00',
        due_date: client.due_date || client.start_date,
      });
    } else {
      setEditingClient(null);
      setFormData({
        client_name: '',
        start_date: new Date().toISOString().split('T')[0],
        boleto_value: '0.00',
        due_date: new Date().toISOString().split('T')[0],
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setErrors({});
  };

  const handleSave = async () => {
    try {
      setErrors({});
      clientInfoSchema.parse({
        name: formData.client_name,
        startDate: formData.start_date,
        boletoValue: formData.boleto_value,
        dueDate: formData.due_date,
      });

      if (!user || !organizationId) return;

      if (editingClient) {
        const { error } = await supabaseClient
          .from('client_timelines')
          .update({
            client_name: formData.client_name,
            start_date: formData.start_date,
            boleto_value: parseFloat(formData.boleto_value),
            due_date: formData.due_date,
          })
          .eq('id', editingClient.id);

        if (error) throw error;

        toast({
          title: 'Cliente atualizado',
          description: 'As informações foram atualizadas com sucesso.',
        });
      } else {
        const { data: timeline, error: timelineError } = await supabaseClient
          .from('client_timelines')
          .insert({
            user_id: user.id,
            organization_id: organizationId,
            client_name: formData.client_name,
            start_date: formData.start_date,
            boleto_value: parseFloat(formData.boleto_value),
            due_date: formData.due_date,
          })
          .select()
          .single();

        if (timelineError) throw timelineError;

        const { error: lineError } = await supabaseClient
          .from('timeline_lines')
          .insert({
            timeline_id: timeline.id,
            position: 0,
          })
          .select()
          .single();

        if (lineError) throw lineError;

        toast({
          title: 'Cliente cadastrado',
          description: 'Cliente criado com sucesso.',
        });
      }

      loadClients();
      handleCloseModal();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            const field = err.path[0] as string;
            const mappedField = field === 'name' ? 'client_name' : 
                              field === 'startDate' ? 'start_date' :
                              field === 'boletoValue' ? 'boleto_value' :
                              field === 'dueDate' ? 'due_date' : field;
            fieldErrors[mappedField] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar o cliente.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabaseClient
        .from('client_timelines')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Cliente excluído',
        description: 'Cliente removido com sucesso.',
      });

      loadClients();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Funções para Timelines (da página Index)
  const loadTimelines = async () => {
    if (!organizationId) return;
    
    try {
      const { data: clientTimelines, error } = await supabaseClient
        .from('client_timelines')
        .select('*')
        .eq('organization_id', organizationId)
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

      loadTimelines();
      loadClients();

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

      loadClients();

      toast({
        title: 'Cliente atualizado',
        description: 'Informações salvas com sucesso.',
      });
    } catch (error: any) {
      loadTimelines();
      
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

      loadTimelines();
      loadClients();

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
            <div className="max-w-6xl mx-auto">
              <div className="h-9 w-64 bg-muted animate-pulse rounded mb-6" />
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
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
            <Tabs defaultValue="lista" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="lista">Lista de Clientes</TabsTrigger>
                <TabsTrigger value="timelines">Todas as Timelines</TabsTrigger>
              </TabsList>

              <TabsContent value="lista" className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                      Gerenciar Clientes
                    </h2>
                    <p className="text-muted-foreground">
                      Cadastre e gerencie os clientes das suas timelines
                    </p>
                  </div>
                  
                  <motion.button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-xl shadow-lg"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus size={20} />
                    Novo Cliente
                  </motion.button>
                </div>

                {clients.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <Calendar size={64} className="mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhum cliente cadastrado
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Comece adicionando seu primeiro cliente
                    </p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-xl"
                    >
                      Cadastrar Cliente
                    </button>
                  </motion.div>
                ) : (
                  <div className="grid gap-4">
                    {clients.map((client, index) => (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground mb-3">
                              {client.client_name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Data de Início</p>
                                <p className="font-semibold">{formatDate(client.start_date)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Valor do Boleto</p>
                                <p className="font-semibold text-green-600">
                                  {formatCurrency(client.boleto_value)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Vencimento</p>
                                <p className="font-semibold">
                                  {client.due_date ? formatDate(client.due_date) : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <motion.button
                              onClick={() => {
                                setManagingClientId(client.id);
                                setManagingClientName(client.client_name);
                              }}
                              className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Gerenciar Timeline"
                            >
                              <List size={18} />
                            </motion.button>
                            <motion.button
                              onClick={() => handleOpenModal(client)}
                              className="p-2 bg-primary text-primary-foreground rounded-lg"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDelete(client.id)}
                              className="p-2 bg-destructive text-destructive-foreground rounded-lg"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timelines" className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    Todas as Timelines
                  </h2>
                  <p className="text-muted-foreground">
                    Visualize e gerencie todas as linhas de cobrança dos clientes
                  </p>
                </div>

                {timelines.map((timeline, index) => (
                  <motion.div
                    key={timeline.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Timeline
                      timeline={timeline}
                      updateLine={(lineId, events) => updateLine(timeline.id, lineId, events)}
                      addNewLine={() => addNewLine(timeline.id)}
                      deleteLine={(lineId) => deleteLine(timeline.id, lineId)}
                      updateClientInfo={(info) => updateClientInfo(timeline.id, info)}
                      onDelete={() => handleDeleteTimeline(timeline.id)}
                      readOnly={false}
                    />
                  </motion.div>
                ))}

                {timelines.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <Calendar size={64} className="mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhuma timeline encontrada
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Crie um cliente para começar a gerenciar timelines
                    </p>
                    <button
                      onClick={handleAddTimeline}
                      disabled={operationLoading.addTimeline}
                      className="px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-xl disabled:opacity-50"
                    >
                      {operationLoading.addTimeline ? 'Criando...' : 'Criar Timeline'}
                    </button>
                  </motion.div>
                )}

                <motion.button
                  onClick={handleAddTimeline}
                  disabled={operationLoading.addTimeline}
                  className="fixed bottom-8 right-8 flex items-center gap-2 px-6 py-4 bg-gradient-primary text-primary-foreground font-semibold rounded-full shadow-2xl disabled:opacity-50"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus size={24} />
                  {operationLoading.addTimeline ? 'Criando...' : 'Nova Timeline'}
                </motion.button>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nome do Cliente</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.client_name ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="Digite o nome do cliente"
                />
                {errors.client_name && (
                  <p className="text-sm text-destructive mt-1">{errors.client_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Data de Início</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.start_date ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive mt-1">{errors.start_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Valor do Boleto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.boleto_value}
                  onChange={(e) => setFormData({ ...formData, boleto_value: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.boleto_value ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="0.00"
                />
                {errors.boleto_value && (
                  <p className="text-sm text-destructive mt-1">{errors.boleto_value}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Data de Vencimento</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.due_date ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.due_date && (
                  <p className="text-sm text-destructive mt-1">{errors.due_date}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <motion.button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-lg shadow-lg"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {editingClient ? 'Atualizar' : 'Cadastrar'}
              </motion.button>
              <motion.button
                onClick={handleCloseModal}
                className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-lg"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Cancelar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Timeline Management Modal */}
      <AnimatePresence>
        {managingClientId && (
          <ClientTimeline
            clientId={managingClientId}
            clientName={managingClientName}
            onClose={() => {
              setManagingClientId(null);
              setManagingClientName('');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
