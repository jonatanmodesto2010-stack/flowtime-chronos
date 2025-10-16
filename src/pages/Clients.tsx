import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ClientDashboardModal } from '@/components/ClientDashboardModal';
import { ClientSearchFilters } from '@/components/ClientSearchFilters';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import type { User } from '@supabase/supabase-js';

interface Client {
  id: string;
  client_name: string;
  client_id?: string | null;
  start_date: string;
  boleto_value?: string | null;
  due_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  organization_id?: string;
  profiles?: {
    full_name: string;
  } | null;
}

const Clients = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useUserRole();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    client_name: '',
    client_id: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatLastUpdate = (updatedAt?: string, userName?: string | null) => {
    if (!updatedAt) return null;
    
    const date = new Date(updatedAt);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const formattedDate = `${day}/${month}/${year}, ${hours}:${minutes}`;
    const displayName = userName || 'Usuário desconhecido';
    
    return `${displayName} - ${formattedDate}`;
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
      loadClients();
    }
  }, [organizationId]);

  const loadClients = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('client_timelines')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
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

  const handleFilterChange = async (filters: any) => {
    if (!organizationId) return;

    let query = supabaseClient
      .from('client_timelines')
      .select(`
        *,
        profiles:user_id (
          full_name
        )
      `)
      .eq('organization_id', organizationId);

    // Search term (nome ou ID)
    if (filters.searchTerm) {
      query = query.or(`client_name.ilike.%${filters.searchTerm}%,client_id.ilike.%${filters.searchTerm}%`);
    }

    // Status filter
    if (filters.statusFilter === 'active') {
      query = query.eq('is_active', true);
    } else if (filters.statusFilter === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Date range filter (data de cadastro)
    if (filters.dateFrom) {
      query = query.gte('start_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('start_date', filters.dateTo);
    }

    // Update date range filter (data de atualização)
    if (filters.updateDateFrom) {
      query = query.gte('updated_at', filters.updateDateFrom);
    }
    if (filters.updateDateTo) {
      query = query.lte('updated_at', filters.updateDateTo);
    }

    // Sempre ordenar por data de atualização (mais recente primeiro)
    query = query.order('updated_at', { ascending: false, nullsFirst: false });

    try {
      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];

      // Tags filter (client-side porque precisa de join complexo)
      if (filters.tagsFilter && filters.tagsFilter.length > 0) {
        const clientIds = results.map(c => c.id);
        
        const { data: clientTags } = await supabaseClient
          .from('client_timeline_tags')
          .select('timeline_id')
          .in('timeline_id', clientIds)
          .in('tag_id', filters.tagsFilter);

        const filteredIds = clientTags?.map(ct => ct.timeline_id) || [];
        results = results.filter(c => filteredIds.includes(c.id));
      }

      // Boleto filter
      if (filters.boletoFilter !== 'all') {
        const clientIds = results.map(c => c.id);
        
        const { data: boletos } = await supabaseClient
          .from('client_boletos')
          .select('timeline_id, status')
          .in('timeline_id', clientIds);

        if (filters.boletoFilter === 'pending') {
          const idsWithPending = boletos?.filter(b => b.status === 'pendente' || b.status === 'atrasado')
            .map(b => b.timeline_id) || [];
          results = results.filter(c => idsWithPending.includes(c.id));
        } else if (filters.boletoFilter === 'paid') {
          const idsWithPaid = boletos?.filter(b => b.status === 'pago').map(b => b.timeline_id) || [];
          results = results.filter(c => idsWithPaid.includes(c.id));
        } else if (filters.boletoFilter === 'none') {
          const idsWithBoletos = boletos?.map(b => b.timeline_id) || [];
          results = results.filter(c => !idsWithBoletos.includes(c.id));
        }
      }

      // Timeline filter
      if (filters.timelineFilter !== 'all') {
        const clientIds = results.map(c => c.id);
        
        const { data: lines } = await supabaseClient
          .from('timeline_lines')
          .select('id, timeline_id')
          .in('timeline_id', clientIds);

        if (filters.timelineFilter === 'with_events' || filters.timelineFilter === 'no_events') {
          const lineIds = lines?.map(l => l.id) || [];
          
          const { data: events } = await supabaseClient
            .from('timeline_events')
            .select('line_id')
            .in('line_id', lineIds);

          const linesWithEvents = events?.map(e => e.line_id) || [];
          const timelinesWithEvents = lines?.filter(l => linesWithEvents.includes(l.id))
            .map(l => l.timeline_id) || [];

          if (filters.timelineFilter === 'with_events') {
            results = results.filter(c => timelinesWithEvents.includes(c.id));
          } else {
            results = results.filter(c => !timelinesWithEvents.includes(c.id));
          }
        } else if (filters.timelineFilter === 'with_analysis') {
          const { data: analysis } = await supabaseClient
            .from('client_analysis_history')
            .select('timeline_id')
            .in('timeline_id', clientIds);

          const idsWithAnalysis = analysis?.map(a => a.timeline_id) || [];
          results = results.filter(c => idsWithAnalysis.includes(c.id));
        }
      }

      setFilteredClients(results);
    } catch (error: any) {
      toast({
        title: 'Erro ao filtrar clientes',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenModal = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
  };

  const handleSaveClient = async (updatedData: Partial<Client>) => {
    if (!selectedClient) return;

    try {
      const { error } = await supabaseClient
        .from('client_timelines')
        .update(updatedData)
        .eq('id', selectedClient.id);

      if (error) throw error;

      await loadClients();
      
      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleCreateClient = async () => {
    if (!organizationId) {
      toast({
        title: 'Erro',
        description: 'Organização não identificada.',
        variant: 'destructive',
      });
      return;
    }

    if (!newClientData.client_name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o nome do cliente.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Erro de autenticação',
          description: 'Usuário não autenticado.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabaseClient
        .from('client_timelines')
        .insert({
          client_name: newClientData.client_name.trim(),
          client_id: newClientData.client_id.trim() || null,
          start_date: newClientData.start_date,
          is_active: true,
          status: 'active',
          organization_id: organizationId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await loadClients();
      setNewClientModalOpen(false);
      
      toast({
        title: 'Cliente criado',
        description: `Cliente "${newClientData.client_name}" foi adicionado com sucesso.`,
      });
      
      if (data) {
        setSelectedClient(data);
        setModalOpen(true);
      }
      
      setNewClientData({
        client_name: '',
        client_id: '',
        start_date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      toast({
        title: 'Erro ao criar cliente',
        description: error.message || 'Ocorreu um erro ao criar o cliente.',
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
            <div className="max-w-4xl mx-auto">
              <div className="h-9 w-48 bg-muted animate-pulse rounded mb-6" />
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
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
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex flex-1 w-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 p-6 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Clientes
            </h2>

            <ClientSearchFilters
              onFilterChange={handleFilterChange}
              organizationId={organizationId}
            />

            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredClients.length} de {clients.length} clientes
              </p>
              
              <motion.button
                onClick={() => setNewClientModalOpen(true)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={18} />
                Novo Cliente
              </motion.button>
            </div>

            {filteredClients.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                {filteredClients.map((client, index) => (
                   <motion.div
                    key={client.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-full rounded-lg p-4 flex items-center gap-4 bg-card hover:bg-card/80 transition-colors cursor-pointer"
                    onClick={() => handleOpenModal(client)}
                  >
                    <div className="flex-1 w-full">
                      <h3 className="text-card-foreground font-bold text-lg uppercase tracking-wide">
                        {client.client_name}
                      </h3>
                      
                      {/* ID do Cliente */}
                      {client.client_id && (
                        <p className="text-xs text-muted-foreground">ID: {client.client_id}</p>
                      )}
                      
                      {/* Última Atualização */}
                      {client.updated_at && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs">🕐</span>
                          <p className="text-xs text-muted-foreground">
                            Última atualização: {formatLastUpdate(
                              client.updated_at, 
                              client.profiles?.full_name
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {!client.is_active && (
                      <div className="px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded flex-shrink-0">
                        Inativo
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <Dialog open={newClientModalOpen} onOpenChange={setNewClientModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações básicas do novo cliente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="new-client-name" className="text-sm font-medium">
                Nome do Cliente *
              </label>
              <Input
                id="new-client-name"
                placeholder="Ex: João Silva"
                value={newClientData.client_name}
                onChange={(e) => setNewClientData(prev => ({ ...prev, client_name: e.target.value }))}
                className="w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateClient();
                  }
                }}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new-client-id" className="text-sm font-medium">
                ID do Cliente
              </label>
              <Input
                id="new-client-id"
                placeholder="Ex: 00064"
                value={newClientData.client_id}
                onChange={(e) => setNewClientData(prev => ({ ...prev, client_id: e.target.value }))}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new-client-date" className="text-sm font-medium">
                Data de Cadastro
              </label>
              <Input
                id="new-client-date"
                type="date"
                value={newClientData.start_date}
                onChange={(e) => setNewClientData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setNewClientModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleCreateClient}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
            >
              Criar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedClient && (
        <ClientDashboardModal
          client={selectedClient}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveClient}
        />
      )}
    </div>
  );
};

export default Clients;