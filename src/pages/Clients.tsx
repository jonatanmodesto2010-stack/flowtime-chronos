import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, History, Loader2, TrendingUp, ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, RefreshCw } from 'lucide-react';
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
import { getCachedData, setCachedData, CACHE_KEYS } from '@/lib/route-cache';
import { ClientsListSkeleton } from '@/components/ClientsListSkeleton';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [overdueDaysMap, setOverdueDaysMap] = useState<Map<string, number>>(new Map());
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
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (organizationId) {
      // Try to restore from cache immediately
      const cached = getCachedData<Client[]>(CACHE_KEYS.CLIENTS);
      const cachedOverdue = getCachedData<Map<string, number>>(CACHE_KEYS.CLIENTS_OVERDUE);
      if (cached) {
        setClients(cached.data);
        setFilteredClients(cached.data);
        if (cachedOverdue) setOverdueDaysMap(cachedOverdue.data);
        setLoading(false);
        // If stale, refresh in background
        if (cached.isStale) {
          loadClients(true);
        }
      } else {
        loadClients();
      }
    } else {
      setLoading(false);
    }
  }, [organizationId]);
  const loadClients = async () => {
    if (!organizationId) return;
    console.log("loadClients: Iniciando, definindo loading para true");
    try {
      setLoading(true);

      // Paginação para buscar todos os clientes (Supabase limita a 1000 por query)
      const allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseClient.from('client_timelines').select(`
            *,
            profiles:user_id (
              full_name
            )
          `).eq('organization_id', organizationId).
        order('updated_at', { ascending: false }).
        range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      console.log("loadClients: Clientes carregados:", allData.length);

      // ✅ Agrupar por client_id, mantendo apenas a timeline mais recente de cada cliente
      const uniqueClients = groupTimelinesByClient(allData) as Client[];
      console.log("loadClients: Após agrupamento:", uniqueClients.length);

      // Buscar boletos pendentes para calcular dias em atraso
      const timelineIds = uniqueClients.map(c => c.id);
      let overdueMap = new Map<string, number>();
      if (timelineIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: overdueBoletos } = await supabaseClient
          .from('client_boletos')
          .select('timeline_id, due_date')
          .in('timeline_id', timelineIds)
          .not('status', 'in', '("pago","cancelado")')
          .lt('due_date', today)
          .order('due_date', { ascending: true });

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        (overdueBoletos || []).forEach((b: any) => {
          if (!overdueMap.has(b.timeline_id)) {
            const bDate = new Date(b.due_date + 'T00:00:00');
            const diff = Math.floor((todayDate.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diff > 0) overdueMap.set(b.timeline_id, diff);
          }
        });
        setOverdueDaysMap(overdueMap);
      }

      // Ordenar com a nova hierarquia: Bloqueados > Vencidos > Ativos > Inativos
      const sortWithOverdue = (a: any, b: any) => {
        const getGroup = (c: any) => {
          if (c.status === 'archived' || c.status === 'completed') return 3;
          if (!c.is_active) return 0;
          if (overdueMap.has(c.id)) return 1;
          return 2;
        };
        const diff = getGroup(a) - getGroup(b);
        if (diff !== 0) return diff;
        return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
      };

      const sortedData = uniqueClients.sort(sortWithOverdue);
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
      query = query.eq('is_active', true).neq('status', 'completed').neq('status', 'archived');
    } else if (filters.statusFilter === 'blocked') {
      query = query.eq('is_active', false).neq('status', 'archived').neq('status', 'completed');
    } else if (filters.statusFilter === 'overdue') {
      // Vencidos: buscar ativos, filtrar client-side pelo overdueDaysMap
      query = query.eq('is_active', true).neq('status', 'completed').neq('status', 'archived');
    } else if (filters.statusFilter === 'inactive') {
      query = query.eq('status', 'archived');
    } else if (filters.statusFilter === 'completed') {
      query = query.eq('status', 'completed').eq('is_active', true);
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
      // Paginação para buscar todos os resultados filtrados
      const allData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batchData, error: batchError } = await query.range(offset, offset + batchSize - 1);
        if (batchError) throw batchError;

        if (batchData && batchData.length > 0) {
          allData.push(...batchData);
          offset += batchSize;
          hasMore = batchData.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      console.log("handleFilterChange: Clientes filtrados carregados:", allData.length);
      let results = allData;

      // Executar todas as queries auxiliares em paralelo
      const clientIds = results.map((c) => c.id);
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
        const filteredIds = tagsData.data.map((ct) => ct.timeline_id);
        results = results.filter((c) => filteredIds.includes(c.id));
      }

      // Aplicar filtros de boleto
      if (filters.boletoFilter !== 'all' && boletosData.data) {
        if (filters.boletoFilter === 'pending') {
          const idsWithPending = boletosData.data.filter((b) => b.status === 'pendente' || b.status === 'atrasado').map((b) => b.timeline_id);
          results = results.filter((c) => idsWithPending.includes(c.id));
        } else if (filters.boletoFilter === 'paid') {
          const idsWithPaid = boletosData.data.filter((b) => b.status === 'pago').map((b) => b.timeline_id);
          results = results.filter((c) => idsWithPaid.includes(c.id));
        } else if (filters.boletoFilter === 'none') {
          const idsWithBoletos = boletosData.data.map((b) => b.timeline_id);
          results = results.filter((c) => !idsWithBoletos.includes(c.id));
        }
      }

      // Aplicar filtros de timeline e ícones
      if ((filters.timelineFilter !== 'all' || filters.iconsFilter && filters.iconsFilter.length > 0) && linesData.data) {
        const lines = linesData.data;

        // Buscar eventos se necessário
        const lineIds = lines.map((l) => l.id);
        const {
          data: events
        } = await supabaseClient.from('timeline_events').select('line_id, icon').in('line_id', lineIds);

        // Aplicar filtro de timeline
        if (filters.timelineFilter === 'with_events' || filters.timelineFilter === 'no_events') {
          const linesWithEvents = events?.map((e) => e.line_id) || [];
          const timelinesWithEvents = lines.filter((l) => linesWithEvents.includes(l.id)).map((l) => l.timeline_id);
          if (filters.timelineFilter === 'with_events') {
            results = results.filter((c) => timelinesWithEvents.includes(c.id));
          } else {
            results = results.filter((c) => !timelinesWithEvents.includes(c.id));
          }
        }

        // Aplicar filtro de ícones
        if (filters.iconsFilter && filters.iconsFilter.length > 0) {
          const eventsWithIcons = events?.filter((e) => filters.iconsFilter.includes(e.icon)) || [];
          const linesWithIcons = eventsWithIcons.map((e) => e.line_id);
          const timelinesWithIcons = lines.filter((l) => linesWithIcons.includes(l.id)).map((l) => l.timeline_id);
          results = results.filter((c) => timelinesWithIcons.includes(c.id));
        }
      }

      // Aplicar filtro de análise
      if (filters.timelineFilter === 'with_analysis' && analysisData.data) {
        const idsWithAnalysis = analysisData.data.map((a) => a.timeline_id);
        results = results.filter((c) => idsWithAnalysis.includes(c.id));
      }

      // Aplicar filtro de vencidos (client-side, baseado no overdueDaysMap)
      if (filters.statusFilter === 'overdue') {
        results = results.filter((c) => overdueDaysMap.has(c.id));
      }

      // Aplicar ordenação por quantidade de eventos
      if (filters.eventCountSort !== 'none') {
        // Buscar contagem de eventos para cada cliente
        const clientIds = results.map((c) => c.id);

        // Buscar linhas e eventos em paralelo
        const {
          data: allLines
        } = await supabaseClient.from('timeline_lines').select('id, timeline_id').in('timeline_id', clientIds);
        const lineIds = allLines?.map((l) => l.id) || [];
        const {
          data: allEvents
        } = await supabaseClient.from('timeline_events').select('id, line_id').in('line_id', lineIds);

        // Criar mapa de contagem de eventos por cliente
        const eventCountMap = new Map<string, number>();
        results.forEach((client) => {
          const clientLines = allLines?.filter((l) => l.timeline_id === client.id) || [];
          const clientLineIds = clientLines.map((l) => l.id);
          const eventCount = allEvents?.filter((e) => clientLineIds.includes(e.line_id)).length || 0;
          eventCountMap.set(client.id, eventCount);
        });

        // Ordenar resultados
        results.sort((a, b) => {
          // Bloqueados SEMPRE no topo
          if (!a.is_active !== !b.is_active) return !a.is_active ? -1 : 1;
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
          // Bloqueados SEMPRE no topo
          if (!a.is_active !== !b.is_active) return !a.is_active ? -1 : 1;
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return filters.updateDateSort === 'desc' ? dateB - dateA : dateA - dateB;
        });
      } else {
        // Se NÃO há ordenação específica, aplicar ordenação com hierarquia
        results.sort((a: any, b: any) => {
          const getGroup = (c: any) => {
            if (c.status === 'archived' || c.status === 'completed') return 3;
            if (!c.is_active) return 0;
            if (overdueDaysMap.has(c.id)) return 1;
            return 2;
          };
          const diff = getGroup(a) - getGroup(b);
          if (diff !== 0) return diff;
          return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
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
  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredClients.length);
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset page when filtered results change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredClients.length]);

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
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
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
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="Primeira página">
                      <ChevronFirst className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} title="Página anterior">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loadClients()} title="Atualizar">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Próxima página">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title="Última página">
                      <ChevronLast className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredClients.length === 0 ? '0 / 0' : `${startIndex + 1} - ${endIndex} / ${filteredClients.length}`}
                  </p>
                </div>
                
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

              {paginatedClients.length === 0 ? <div className="text-center py-20 text-muted-foreground">
                  <p>Nenhum cliente encontrado</p>
                </div> : <div className="flex flex-col gap-3 w-full">
                  {paginatedClients.map((client, index) => <motion.div key={client.id} initial={{
                  opacity: 0,
                  x: -20
                }} animate={{
                  opacity: 1,
                  x: 0
                }} transition={{
                  duration: 0.2
                }} className={`w-full rounded-lg p-4 flex items-center gap-4 transition-colors ${client.status === 'archived' ? 'bg-muted/50 hover:bg-muted/60 border border-muted-foreground/20 opacity-70' : isCompleted(client.status) ? 'bg-muted/50 hover:bg-muted/60 opacity-70 grayscale' : !client.is_active ? 'bg-red-500/10 hover:bg-red-500/15 border border-red-500/30' : client.is_active && overdueDaysMap.has(client.id) ? 'bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30' : 'bg-card hover:bg-card/80'}`}>
                      <div className="flex-1 w-full cursor-pointer" onClick={() => handleOpenModal(client)}>
                        <h3 className={`font-bold text-xl uppercase tracking-wide ${isCompleted(client.status) ? 'text-muted-foreground' : 'text-card-foreground'}`}>
                          {client.client_name}
                        </h3>
                        
                        {/* Última Atualização - hidden */}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Dias em atraso - boleto mais antigo vencido */}
                        {(() => {
                          if (isCompleted(client.status) || client.status === 'archived') return null;
                          const days = overdueDaysMap.get(client.id);
                          if (!days || days <= 0) return null;
                          return (
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-destructive text-destructive text-xs font-bold flex-shrink-0" title={`${days} dias em atraso`}>
                              {days}d
                            </div>
                          );
                        })()}

                        {/* Badge dinâmico baseado no status */}
                        {client.status === 'archived' ? <div className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded flex-shrink-0 font-semibold uppercase">
                            ⚠️ INATIVO
                          </div> : isCompleted(client.status) ? <div className="px-2 py-1 bg-gray-500/20 text-gray-500 text-xs rounded flex-shrink-0 font-semibold">
                            FINALIZADO
                          </div> : !client.is_active ? <div className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded flex-shrink-0 font-semibold uppercase">
                            🔒 BLOQUEADO
                          </div> : <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex-shrink-0 font-semibold uppercase">
                            ✅ ATIVO
                          </div>}
                        
                        <Button variant="outline" size="icon" onClick={(e) => {e.stopPropagation();
                        handleOpenTimelineDialog(client);
                      }} className="border-green-500/30 hover:bg-green-500/10 text-green-400 hover:text-green-300" title="Ver Timeline">
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>)}
                </div>}
            </motion.div>

          {/* Coluna Direita - Calendário e Retiradas */}
          <div className="hidden xl:flex flex-1 flex-col gap-4">
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
              <Input id="new-client-name" placeholder="Ex: João Silva" value={newClientData.client_name} onChange={(e) => setNewClientData((prev) => ({
                ...prev,
                client_name: e.target.value
              }))} className="w-full" autoFocus onKeyDown={(e) => {
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
              <Input id="new-client-id" placeholder="Ex: 00064" value={newClientData.client_id} onChange={(e) => setNewClientData((prev) => ({
                ...prev,
                client_id: e.target.value
              }))} className="w-full" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new-client-date" className="text-sm font-medium">
                Data de Cadastro
              </label>
              <Input id="new-client-date" type="date" value={newClientData.start_date} onChange={(e) => setNewClientData((prev) => ({
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