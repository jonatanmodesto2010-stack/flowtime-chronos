import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, History, Loader2, TrendingUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
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
import { ClientTimelineDialog } from '@/components/ClientTimelineDialog';
import { groupTimelinesByClient } from '@/lib/client-utils';
import { CalendarWidget } from '@/components/CalendarWidget';
import { RetiradaWidget } from '@/components/RetiradaWidget';
interface Client {
  id: string;
  client_name: string;
  client_id?: string | null;
  start_date: string;
  boleto_value?: string | null;
  due_date?: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at?: string;
  organization_id?: string;
  profiles?: {
    full_name: string;
  } | null;
}
const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const isFilteringRef = useRef(isFiltering); // Ref para o estado isFiltering
  const {
    organizationId
  } = useUserRole();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    client_name: '',
    client_id: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [showClientTimelineDialog, setShowClientTimelineDialog] = useState(false); // Novo estado
  const [clientForTimeline, setClientForTimeline] = useState<Client | null>(null); // Novo estado
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Atualiza o ref sempre que isFiltering muda
  useEffect(() => {
    isFilteringRef.current = isFiltering;
  }, [isFiltering]);
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
  const isCompleted = (status: string) => {
    return status === 'completed' || status === 'archived';
  };
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
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
    console.log("loadClients: Iniciando, definindo loading para true");
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabaseClient.from('client_timelines').select(`
          *,
          profiles:user_id (
            full_name
          )
        `).eq('organization_id', organizationId).order('updated_at', {
        ascending: false
      });
      if (error) throw error;
      console.log("loadClients: Clientes carregados:", data?.length);

      // ✅ Agrupar por client_id, mantendo apenas a timeline mais recente de cada cliente
      const uniqueClients = groupTimelinesByClient(data || []) as Client[];
      console.log("loadClients: Após agrupamento:", uniqueClients.length);

      // Ordenar: timelines ativas primeiro, depois finalizadas, cada grupo por updated_at
      const sortedData = uniqueClients.sort((a, b) => {
        // Verificar se é finalizada
        const aCompleted = a.status === 'completed' || a.status === 'archived';
        const bCompleted = b.status === 'completed' || b.status === 'archived';

        // Se um é finalizado e outro não, o não-finalizado vem primeiro
        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1;
        }

        // Se ambos têm o mesmo status, ordenar por updated_at (mais recente primeiro)
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });
      setClients(sortedData);
      setFilteredClients(sortedData);
    } catch (error: any) {
      console.error("loadClients: Erro ao carregar clientes:", error.message);
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setIsFiltering(false); // Garante que isFiltering seja false após o carregamento inicial/CRUD
      console.log("loadClients: Finalizado, definindo loading para false e isFiltering para false");
    }
  };
  const handleFilterChange = useCallback(async (filters: any) => {
    if (!organizationId) return;
    console.log("handleFilterChange: Início da chamada. isFilteringRef.current:", isFilteringRef.current);
    if (isFilteringRef.current) {
      // Usa o ref para verificar o estado mais recente
      console.log("handleFilterChange: Já está filtrando, retornando cedo.");
      return;
    }
    setIsFiltering(true);
    console.log("handleFilterChange: Definindo isFiltering para TRUE.");
    let query = supabaseClient.from('client_timelines').select(`
        *,
        profiles:user_id (
          full_name
        )
      `).eq('organization_id', organizationId);

    // Search term (nome ou ID)
    if (filters.searchTerm) {
      query = query.or(`client_name.ilike.${filters.searchTerm}%,client_id.ilike.${filters.searchTerm}%`);
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

    // Remover ordenação SQL - faremos no cliente após os filtros

    try {
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      console.log("handleFilterChange: Clientes filtrados carregados:", data?.length);
      let results = data || [];

      // Executar todas as queries auxiliares em paralelo
      const clientIds = results.map(c => c.id);
      const [tagsData, boletosData, linesData, analysisData] = await Promise.all([
      // Tags filter
      filters.tagsFilter && filters.tagsFilter.length > 0 ? supabaseClient.from('client_timeline_tags').select('timeline_id').in('timeline_id', clientIds).in('tag_id', filters.tagsFilter) : Promise.resolve({
        data: []
      }),
      // Boleto filter
      filters.boletoFilter !== 'all' ? supabaseClient.from('client_boletos').select('timeline_id, status').in('timeline_id', clientIds) : Promise.resolve({
        data: []
      }),
      // Timeline filter (lines)
      filters.timelineFilter !== 'all' || filters.iconsFilter && filters.iconsFilter.length > 0 ? supabaseClient.from('timeline_lines').select('id, timeline_id').in('timeline_id', clientIds) : Promise.resolve({
        data: []
      }),
      // Analysis filter
      filters.timelineFilter === 'with_analysis' ? supabaseClient.from('client_analysis_history').select('timeline_id').in('timeline_id', clientIds) : Promise.resolve({
        data: []
      })]);

      // Aplicar filtros de tags
      if (filters.tagsFilter && filters.tagsFilter.length > 0 && tagsData.data) {
        const filteredIds = tagsData.data.map(ct => ct.timeline_id);
        results = results.filter(c => filteredIds.includes(c.id));
      }

      // Aplicar filtros de boleto
      if (filters.boletoFilter !== 'all' && boletosData.data) {
        if (filters.boletoFilter === 'pending') {
          const idsWithPending = boletosData.data.filter(b => b.status === 'pendente' || b.status === 'atrasado').map(b => b.timeline_id);
          results = results.filter(c => idsWithPending.includes(c.id));
        } else if (filters.boletoFilter === 'paid') {
          const idsWithPaid = boletosData.data.filter(b => b.status === 'pago').map(b => b.timeline_id);
          results = results.filter(c => idsWithPaid.includes(c.id));
        } else if (filters.boletoFilter === 'none') {
          const idsWithBoletos = boletosData.data.map(b => b.timeline_id);
          results = results.filter(c => !idsWithBoletos.includes(c.id));
        }
      }

      // Aplicar filtros de timeline e ícones
      if ((filters.timelineFilter !== 'all' || filters.iconsFilter && filters.iconsFilter.length > 0) && linesData.data) {
        const lines = linesData.data;

        // Buscar eventos se necessário
        const lineIds = lines.map(l => l.id);
        const {
          data: events
        } = await supabaseClient.from('timeline_events').select('line_id, icon').in('line_id', lineIds);

        // Aplicar filtro de timeline
        if (filters.timelineFilter === 'with_events' || filters.timelineFilter === 'no_events') {
          const linesWithEvents = events?.map(e => e.line_id) || [];
          const timelinesWithEvents = lines.filter(l => linesWithEvents.includes(l.id)).map(l => l.timeline_id);
          if (filters.timelineFilter === 'with_events') {
            results = results.filter(c => timelinesWithEvents.includes(c.id));
          } else {
            results = results.filter(c => !timelinesWithEvents.includes(c.id));
          }
        }

        // Aplicar filtro de ícones
        if (filters.iconsFilter && filters.iconsFilter.length > 0) {
          const eventsWithIcons = events?.filter(e => filters.iconsFilter.includes(e.icon)) || [];
          const linesWithIcons = eventsWithIcons.map(e => e.line_id);
          const timelinesWithIcons = lines.filter(l => linesWithIcons.includes(l.id)).map(l => l.timeline_id);
          results = results.filter(c => timelinesWithIcons.includes(c.id));
        }
      }

      // Aplicar filtro de análise
      if (filters.timelineFilter === 'with_analysis' && analysisData.data) {
        const idsWithAnalysis = analysisData.data.map(a => a.timeline_id);
        results = results.filter(c => idsWithAnalysis.includes(c.id));
      }

      // Aplicar ordenação por quantidade de eventos
      if (filters.eventCountSort !== 'none') {
        // Buscar contagem de eventos para cada cliente
        const clientIds = results.map(c => c.id);

        // Buscar linhas e eventos em paralelo
        const {
          data: allLines
        } = await supabaseClient.from('timeline_lines').select('id, timeline_id').in('timeline_id', clientIds);
        const lineIds = allLines?.map(l => l.id) || [];
        const {
          data: allEvents
        } = await supabaseClient.from('timeline_events').select('id, line_id').in('line_id', lineIds);

        // Criar mapa de contagem de eventos por cliente
        const eventCountMap = new Map<string, number>();
        results.forEach(client => {
          const clientLines = allLines?.filter(l => l.timeline_id === client.id) || [];
          const clientLineIds = clientLines.map(l => l.id);
          const eventCount = allEvents?.filter(e => clientLineIds.includes(e.line_id)).length || 0;
          eventCountMap.set(client.id, eventCount);
        });

        // Ordenar resultados
        results.sort((a, b) => {
          const countA = eventCountMap.get(a.id) || 0;
          const countB = eventCountMap.get(b.id) || 0;
          if (filters.eventCountSort === 'desc') {
            return countB - countA; // Maior primeiro
          } else {
            return countA - countB; // Menor primeiro
          }
        });
      } else if (filters.updateDateSort !== 'none') {
        // Ordenação por data de atualização
        results.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return filters.updateDateSort === 'desc' ? dateB - dateA : dateA - dateB;
        });
      } else {
        // Se NÃO há ordenação específica, aplicar ordenação padrão
        results.sort((a, b) => {
          // Verificar se é finalizada
          const aCompleted = a.status === 'completed' || a.status === 'archived';
          const bCompleted = b.status === 'completed' || b.status === 'archived';

          // Se um é finalizado e outro não, o não-finalizado vem primeiro
          if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1;
          }

          // Se ambos têm o mesmo status, ordenar por updated_at (mais recente primeiro)
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA;
        });
      }

      // ✅ Aplicar agrupamento por client_id nos resultados filtrados
      const uniqueResults = groupTimelinesByClient(results) as Client[];
      setFilteredClients(uniqueResults);
    } catch (error: any) {
      console.error("handleFilterChange: Erro ao filtrar clientes:", error.message);
      toast({
        title: 'Erro ao filtrar clientes',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsFiltering(false);
      console.log("handleFilterChange: Finalizado, definindo isFiltering para FALSE.");
    }
  }, [organizationId, toast]); // Dependências do useCallback

  const handleOpenModal = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
  };
  const handleOpenTimelineDialog = (client: Client) => {
    setClientForTimeline(client);
    setShowClientTimelineDialog(true);
  };
  const handleCloseTimelineDialog = () => {
    setShowClientTimelineDialog(false);
    setClientForTimeline(null);
  };
  const handleSaveClient = async (updatedData: Partial<Client>) => {
    if (!selectedClient) return;
    try {
      const {
        error
      } = await supabaseClient.from('client_timelines').update(updatedData).eq('id', selectedClient.id);
      if (error) throw error;
      await loadClients();
      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram atualizadas com sucesso.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };
  const handleCreateClient = async () => {
    if (!organizationId) {
      toast({
        title: 'Erro',
        description: 'Organização não identificada.',
        variant: 'destructive'
      });
      return;
    }
    const clientNameTrimmed = newClientData.client_name.trim();
    if (!clientNameTrimmed) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o nome do cliente.',
        variant: 'destructive'
      });
      return;
    }
    try {
      // 1. Verificar se já existe um cliente com o mesmo nome na organização
      const {
        data: existingClients,
        error: checkError
      } = await supabaseClient.from('client_timelines').select('id').eq('organization_id', organizationId).ilike('client_name', clientNameTrimmed); // Busca case-insensitive

      if (checkError) throw checkError;
      if (existingClients && existingClients.length > 0) {
        toast({
          title: 'Nome duplicado',
          description: `Já existe um cliente com o nome "${clientNameTrimmed}". Por favor, use um nome diferente.`,
          variant: 'destructive'
        });
        return; // Impede a criação do cliente
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro de autenticação',
          description: 'Usuário não autenticado.',
          variant: 'destructive'
        });
        return;
      }
      const {
        data,
        error
      } = await supabaseClient.from('client_timelines').insert({
        client_name: clientNameTrimmed,
        client_id: newClientData.client_id.trim() || null,
        start_date: newClientData.start_date,
        is_active: true,
        status: 'active',
        organization_id: organizationId,
        user_id: user.id
      }).select().single();
      if (error) throw error;
      await loadClients();
      setNewClientModalOpen(false);
      toast({
        title: 'Cliente criado',
        description: `Cliente "${clientNameTrimmed}" foi adicionado com sucesso.`
      });
      if (data) {
        setSelectedClient(data);
        setModalOpen(true);
      }
      setNewClientData({
        client_name: '',
        client_id: '',
        start_date: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      toast({
        title: 'Erro ao criar cliente',
        description: error.message || 'Ocorreu um erro ao criar o cliente.',
        variant: 'destructive'
      });
    }
  };
  if (loading) {
    return <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <div className="h-9 w-48 bg-muted animate-pulse rounded mb-6" />
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>;
  }
  console.log("Render: isFiltering =", isFiltering, " loading =", loading);
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex gap-6">
            {/* Coluna Esquerda - Lista de Clientes */}
            <motion.div initial={{
              opacity: 0,
              y: -20
            }} animate={{
              opacity: 1,
              y: 0
            }} className="flex-1 max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Clientes
              </h2>

              <ClientSearchFilters onFilterChange={handleFilterChange} organizationId={organizationId} pageName="clients" />

              {/* Loading Indicator */}
              {isFiltering && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 px-1">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Buscando clientes...</span>
                </div>}

              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredClients.length} de {clients.length} clientes
                </p>
                
                <div className="flex items-center gap-3">
                  <motion.button onClick={() => navigate('/history')} initial={{
                    opacity: 0,
                    scale: 0.9
                  }} animate={{
                    opacity: 1,
                    scale: 1
                  }} whileHover={{
                    scale: 1.05
                  }} whileTap={{
                    scale: 0.95
                  }} className="px-6 py-2 bg-primary/10 text-primary rounded-lg font-semibold hover:bg-primary/20 transition-all flex items-center gap-2 whitespace-nowrap">
                    <History size={18} />
                    Histórico
                  </motion.button>

                  <motion.button onClick={() => setNewClientModalOpen(true)} initial={{
                    opacity: 0,
                    scale: 0.9
                  }} animate={{
                    opacity: 1,
                    scale: 1
                  }} whileHover={{
                    scale: 1.05
                  }} whileTap={{
                    scale: 0.95
                  }} className="px-6 py-2 bg-gradient-primary text-primary-foreground rounded-lg font-semibold hover:bg-gradient-hover transition-all flex items-center gap-2 whitespace-nowrap">
                    <Plus size={18} />
                    Novo Cliente
                  </motion.button>
                </div>
              </div>

              {filteredClients.length === 0 ? <div className="text-center py-20 text-muted-foreground">
                  <p>Nenhum cliente encontrado</p>
                </div> : <div className="flex flex-col gap-3 w-full">
                  {filteredClients.map((client, index) => <motion.div key={client.id} initial={{
                  opacity: 0,
                  x: -20
                }} animate={{
                  opacity: 1,
                  x: 0
                }} transition={{
                  delay: index * 0.05
                }} className={`w-full rounded-lg p-4 flex items-center gap-4 transition-colors ${isCompleted(client.status) ? 'bg-muted/50 hover:bg-muted/60 opacity-70 grayscale' : 'bg-card hover:bg-card/80'}`}>
                      <div className="flex-1 w-full cursor-pointer" onClick={() => handleOpenModal(client)}>
                        <h3 className={`font-bold text-xl uppercase tracking-wide ${isCompleted(client.status) ? 'text-muted-foreground' : 'text-card-foreground'}`}>
                          {client.client_name}
                        </h3>
                        
                        {/* Última Atualização */}
                        {client.updated_at && <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs">🕐</span>
                            <p className="text-xs text-muted-foreground">
                              Última atualização: {formatLastUpdate(client.updated_at, client.profiles?.full_name)}
                            </p>
                          </div>}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Badge dinâmico baseado no status */}
                        {isCompleted(client.status) ? <div className="px-2 py-1 bg-gray-500/20 text-gray-500 text-xs rounded flex-shrink-0 font-semibold">
                            FINALIZADO
                          </div> : !client.is_active && <div className="px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded flex-shrink-0">
                            Inativo
                          </div>}
                        
                        <Button variant="outline" size="icon" onClick={e => {
                      e.stopPropagation();
                      handleOpenTimelineDialog(client);
                    }} className="border-green-500/30 hover:bg-green-500/10 text-green-400 hover:text-green-300" title="Ver Timeline">
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>)}
                </div>}
            </motion.div>

            {/* Coluna Direita - Calendário e Retiradas */}
            <div className="hidden xl:flex w-72 flex-col gap-4 flex-shrink-0">
              <CalendarWidget />
              <RetiradaWidget onClientSelect={(client) => handleOpenModal(client as Client)} />
            </div>
          </div>
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
              <Input id="new-client-name" placeholder="Ex: João Silva" value={newClientData.client_name} onChange={e => setNewClientData(prev => ({
                ...prev,
                client_name: e.target.value
              }))} className="w-full" autoFocus onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateClient();
                }
              }} />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new-client-id" className="text-sm font-medium">
                ID do Cliente
              </label>
              <Input id="new-client-id" placeholder="Ex: 00064" value={newClientData.client_id} onChange={e => setNewClientData(prev => ({
                ...prev,
                client_id: e.target.value
              }))} className="w-full" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new-client-date" className="text-sm font-medium">
                Data de Cadastro
              </label>
              <Input id="new-client-date" type="date" value={newClientData.start_date} onChange={e => setNewClientData(prev => ({
                ...prev,
                start_date: e.target.value
              }))} className="w-full" />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setNewClientModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateClient} className="bg-gradient-primary hover:bg-gradient-hover">
              Criar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedClient && <ClientDashboardModal client={selectedClient} isOpen={modalOpen} onClose={handleCloseModal} onSave={handleSaveClient} />}

      {clientForTimeline && <ClientTimelineDialog client={clientForTimeline} isOpen={showClientTimelineDialog} onClose={handleCloseTimelineDialog} />}
    </div>
  </SidebarProvider>;
};
export default Clients;