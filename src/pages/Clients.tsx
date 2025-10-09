import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Calendar, List, Search } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ClientTimeline } from '@/components/ClientTimeline';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { clientInfoSchema } from '@/lib/validations';
import { Badge } from '@/components/ui/badge';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    client_name: '',
    start_date: new Date().toISOString().split('T')[0],
    boleto_value: '0.00',
    due_date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
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
            <div className="flex items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Gerenciar Clientes
                </h2>
                <p className="text-muted-foreground">
                  Cadastre e gerencie os clientes das suas timelines
                </p>
              </div>
              
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
                
                <motion.button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-xl shadow-lg whitespace-nowrap"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus size={20} />
                  Novo Cliente
                </motion.button>
              </div>
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
                {clients
                  .filter((client) =>
                    client.client_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((client, index) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-foreground">
                            {client.client_name}
                          </h3>
                          <Badge className="bg-red-500 text-white hover:bg-red-600">
                            COBRANÇA
                          </Badge>
                        </div>
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
