import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Calendar, DollarSign, Tag as TagIcon, User, Clock, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AIAnalysisSection } from './AIAnalysisSection';
import { ClientTimelineDialog } from './ClientTimelineDialog';
import { formatCurrency, formatDate } from '@/lib/metrics-calculator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  client_name: string;
  client_id?: string | null;
  start_date: string;
  due_date?: string | null;
  boleto_value?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  organization_id?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ClientDashboardModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedClient: Partial<Client>) => Promise<void>;
}

export const ClientDashboardModal = ({
  client,
  isOpen,
  onClose,
  onSave,
}: ClientDashboardModalProps) => {
  const [formData, setFormData] = useState({
    client_name: client.client_name,
    client_id: client.client_id || '',
    start_date: client.start_date,
    boleto_value: client.boleto_value || '',
    is_active: client.is_active,
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [boletos, setBoletos] = useState<Array<{
    id?: string;
    boleto_value: string;
    due_date: string;
    status: string;
    description?: string;
  }>>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string>('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleOpenCalendar = () => {
    // Navegar para calendário com filtro de cliente
    window.location.href = `/calendar?client=${client.id}`;
  };

  useEffect(() => {
    if (isOpen && client.organization_id) {
      loadTags();
      loadClientTags();
      loadAnalysisHistory();
      loadBoletos();
      loadTimelineEvents();
      loadLastUpdatedBy();
    }
  }, [isOpen, client.id, client.organization_id]);

  useEffect(() => {
    if (showCalendar) {
      handleOpenCalendar();
    }
  }, [showCalendar]);

  const loadTags = async () => {
    if (!client.organization_id) return;

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('organization_id', client.organization_id)
      .order('name');

    if (!error && data) {
      setTags(data);
    }
  };

  const loadClientTags = async () => {
    const { data, error } = await supabase
      .from('client_timeline_tags')
      .select('tag_id')
      .eq('timeline_id', client.id);

    if (!error && data) {
      setSelectedTags(data.map(t => t.tag_id));
    }
  };

  const loadAnalysisHistory = async () => {
    const { data, error } = await supabase
      .from('client_analysis_history')
      .select('*')
      .eq('timeline_id', client.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setAnalysisHistory(data);
    }
  };

  const loadBoletos = async () => {
    const { data, error } = await supabase
      .from('client_boletos')
      .select('*')
      .eq('timeline_id', client.id)
      .order('due_date', { ascending: true });

    if (!error && data) {
      setBoletos(data.map(b => ({
        id: b.id,
        boleto_value: b.boleto_value.toString(),
        due_date: b.due_date,
        status: b.status,
        description: b.description || undefined
      })));
    }
  };

  const loadTimelineEvents = async () => {
    try {
      const { data: lines, error: linesError } = await supabase
        .from('timeline_lines')
        .select('id')
        .eq('timeline_id', client.id);

      if (linesError) throw linesError;

      if (lines && lines.length > 0) {
        const lineIds = lines.map(l => l.id);

        const { data: events, error: eventsError } = await supabase
          .from('timeline_events')
          .select('*')
          .in('line_id', lineIds)
          .order('event_date', { ascending: false });

        if (eventsError) throw eventsError;

        setTimelineEvents(events || []);
      } else {
        setTimelineEvents([]);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos da timeline:', error);
      setTimelineEvents([]);
    }
  };

  const loadLastUpdatedBy = async () => {
    console.log('[ClientDashboardModal] loadLastUpdatedBy - iniciando');
    try {
      const { data: timeline, error: timelineError } = await supabase
        .from('client_timelines')
        .select('updated_at, user_id')
        .eq('id', client.id)
        .single();

      if (timelineError) {
        console.error('[ClientDashboardModal] Erro ao buscar timeline:', timelineError);
        throw timelineError;
      }

      console.log('[ClientDashboardModal] timeline encontrada:', timeline);

      if (timeline) {
        setLastUpdatedAt(timeline.updated_at);

        if (timeline.user_id) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', timeline.user_id)
            .single();

          if (!profileError && profile) {
            console.log('[ClientDashboardModal] profile encontrado:', profile);
            setLastUpdatedBy(profile.full_name || 'Usuário');
          } else {
            console.log('[ClientDashboardModal] profile não encontrado ou erro:', profileError);
            setLastUpdatedBy('Sistema');
          }
        } else {
          console.log('[ClientDashboardModal] user_id não existe na timeline');
          setLastUpdatedBy('Sistema');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar informações de atualização:', error);
      setLastUpdatedBy('Sistema');
    }
  };

  const handleSave = async () => {
    console.log('[ClientDashboardModal] handleSave - iniciando salvamento');
    setSaving(true);
    try {
      // Obter o user_id atual para atualizar o campo updated_by
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[ClientDashboardModal] user obtido:', user?.id);
      
      const updateData = {
        ...formData,
        ...(user?.id && { user_id: user.id })
      };
      
      console.log('[ClientDashboardModal] updateData:', updateData);
      await onSave(updateData);
      
      // Update tags
      await supabase
        .from('client_timeline_tags')
        .delete()
        .eq('timeline_id', client.id);

      if (selectedTags.length > 0) {
        await supabase
          .from('client_timeline_tags')
          .insert(selectedTags.map(tagId => ({
            timeline_id: client.id,
            tag_id: tagId
          })));
      }

      // ============================================
      // SALVAR BOLETOS
      // ============================================
      // Deletar boletos antigos
      await supabase
        .from('client_boletos')
        .delete()
        .eq('timeline_id', client.id);

      // Inserir novos boletos
      if (boletos.length > 0) {
        const boletosToInsert = boletos
          .filter(b => b.boleto_value && b.due_date) // Apenas boletos válidos
          .map(b => ({
            timeline_id: client.id,
            boleto_value: parseFloat(b.boleto_value),
            due_date: b.due_date,
            status: b.status,
            description: b.description || null
          }));

        if (boletosToInsert.length > 0) {
          await supabase
            .from('client_boletos')
            .insert(boletosToInsert);
        }
      }

      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram salvas com sucesso.',
      });
      
      console.log('[ClientDashboardModal] salvamento concluído, recarregando dados');
      
      // Recarregar informações de atualização
      await loadLastUpdatedBy();
      
      console.log('[ClientDashboardModal] dados recarregados, fechando modal');
      
      // Fechar o modal após salvar
      onClose();
    } catch (error) {
      console.error('[ClientDashboardModal] Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar as informações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('client_timelines')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Cliente excluído',
        description: 'O cliente foi removido com sucesso.',
      });

      setShowDeleteConfirm(false);
      onClose();
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Ocorreu um erro ao excluir o cliente.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border-2 border-green-500/50 rounded-xl shadow-2xl w-full max-w-7xl h-[calc(100vh-100px)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-green-500/30">
          <div>
            <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
              <User className="w-6 h-6" />
              Informações do Cliente
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie dados e análises de cobrança
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setShowTimeline(true)}
              className="border-green-500/30 hover:bg-green-500/10 text-green-400 hover:text-green-300"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Timeline
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => setShowCalendar(true)}
              className="border-green-500/30 hover:bg-green-500/10 text-green-400 hover:text-green-300"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendário
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                📊 Informações Básicas
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="start_date">Data de Cadastro</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    disabled
                    readOnly
                    className="mt-1 bg-muted cursor-not-allowed opacity-70"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    📅 Data em que o cliente foi cadastrado no sistema
                  </p>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="client_name">Nome do Cliente *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="client_id">ID do Cliente</Label>
                  <Input
                    id="client_id"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="mt-1"
                    placeholder="Opcional"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-card rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <Label htmlFor="is_active">Status Ativo</Label>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Multiple Boletos Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Boletos e Vencimentos ({boletos.length})
                </h3>
                <Button
                  size="sm"
                  onClick={() => setBoletos([...boletos, { 
                    boleto_value: '', 
                    due_date: '', 
                    status: 'pendente',
                    description: ''
                  }])}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  type="button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Boleto
                </Button>
              </div>

              {boletos.length === 0 ? (
                <div className="text-center py-8 bg-card/50 rounded-lg border border-dashed border-border">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">Nenhum boleto adicionado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique no botão acima para adicionar boletos
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {boletos.map((boleto, index) => {
                    // Calcular dias de atraso
                    const today = new Date();
                    const dueDate = new Date(boleto.due_date);
                    const diffTime = today.getTime() - dueDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const diasAtraso = diffDays > 0 ? diffDays : 0;
                    
                    return (
                      <div
                        key={boleto.id || `new-${index}`}
                        className="p-4 bg-card/50 rounded-lg border border-border hover:border-orange-500/50 transition-colors"
                      >
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-foreground">Valor (R$) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={boleto.boleto_value}
                              onChange={(e) => {
                                const updated = [...boletos];
                                updated[index].boleto_value = e.target.value;
                                setBoletos(updated);
                              }}
                              placeholder="100"
                              className="mt-1 bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-foreground">Vencimento *</Label>
                            <Input
                              type="date"
                              value={boleto.due_date}
                              onChange={(e) => {
                                const updated = [...boletos];
                                updated[index].due_date = e.target.value;
                                setBoletos(updated);
                              }}
                              className="mt-1 bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-foreground">Status</Label>
                            <div className="mt-1 p-2 bg-background rounded-md border border-input flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                boleto.status === 'pago' ? 'bg-green-500' :
                                boleto.status === 'atrasado' ? 'bg-red-500' :
                                boleto.status === 'cancelado' ? 'bg-gray-500' :
                                'bg-yellow-500'
                              }`} />
                              <span className="text-sm">
                                {boleto.status === 'pago' ? 'Pago' :
                                 boleto.status === 'atrasado' ? `Atrasado ${diasAtraso > 0 ? `a ${diasAtraso} dias` : ''}` :
                                 boleto.status === 'cancelado' ? 'Cancelado' :
                                 'Pendente'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-foreground">Descrição (opcional)</Label>
                            <Input
                              value={boleto.description || ''}
                              onChange={(e) => {
                                const updated = [...boletos];
                                updated[index].description = e.target.value;
                                setBoletos(updated);
                              }}
                              placeholder="Ex: Mensalidade de Abril"
                              className="mt-1 bg-background"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setBoletos(boletos.filter((_, i) => i !== index));
                            }}
                            className="w-full"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total de Boletos Pendentes */}
              {boletos.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-2 border-orange-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Pendente</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {boletos.filter(b => b.status === 'pendente' || b.status === 'atrasado').length} boletos
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-orange-500">
                        {formatCurrency(
                          boletos
                            .filter(b => (b.status === 'pendente' || b.status === 'atrasado') && b.boleto_value)
                            .reduce((sum, b) => sum + parseFloat(b.boleto_value || '0'), 0)
                            .toFixed(2)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Tags Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                <TagIcon className="w-5 h-5" />
                Tags
              </h3>

              <div className="flex flex-wrap gap-2">
                {selectedTags.length > 0 ? (
                  tags
                    .filter(tag => selectedTags.includes(tag.id))
                    .map(tag => (
                      <Badge
                        key={tag.id}
                        style={{ 
                          backgroundColor: tag.color,
                          color: 'white'
                        }}
                        className="border-0"
                      >
                        {tag.name}
                      </Badge>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma tag associada a este cliente</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Timeline Events Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                📅 Eventos da Timeline ({timelineEvents.length})
              </h3>

              {timelineEvents.length === 0 ? (
                <div className="text-center py-8 bg-card/50 rounded-lg border border-dashed">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">Nenhum evento na timeline</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em "Timeline" acima para adicionar eventos
                  </p>
                </div>
              ) : (
                <>
                  {/* Estatísticas dos Eventos */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-muted/30 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Criados</p>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {timelineEvents.filter(e => e.status === 'created').length}
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <p className="text-xs text-muted-foreground">Resolvidos</p>
                      <p className="text-2xl font-bold text-green-400">
                        {timelineEvents.filter(e => e.status === 'resolved').length}
                      </p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-xs text-muted-foreground">Sem Resposta</p>
                      <p className="text-2xl font-bold text-red-400">
                        {timelineEvents.filter(e => e.status === 'no-response').length}
                      </p>
                    </div>
                  </div>

                  {/* Lista de Eventos (últimos 5) */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {timelineEvents.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className="p-3 bg-card/50 rounded-lg border border-border hover:border-blue-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span className={`${event.icon_size || 'text-2xl'}`}>
                              {event.icon || '💬'}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {formatDate(event.event_date)}
                                </span>
                                {event.event_time && (
                                  <span className="text-xs text-muted-foreground">
                                    {event.event_time}
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`${
                              event.status === 'resolved' ? 'bg-green-500' :
                              event.status === 'no-response' ? 'bg-red-500' :
                              'bg-muted'
                            } text-white text-xs`}>
                              {event.status === 'resolved' ? '✅ Resolvido' :
                               event.status === 'no-response' ? '❌ Sem Resposta' :
                               '⚫ Criado'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {event.position === 'top' ? '⬆️ Top' : '⬇️ Bottom'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botão Ver Timeline Completa */}
                  {timelineEvents.length > 5 && (
                    <div className="text-center pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTimeline(true)}
                        className="border-blue-500/30 hover:bg-blue-500/10"
                      >
                        Ver todos os {timelineEvents.length} eventos
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <Separator />

            {/* AI Analysis Section */}
            <AIAnalysisSection timelineId={client.id} clientName={client.client_name} />

            <Separator />

            {/* Analysis History */}
            {analysisHistory.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                  📝 Histórico de Análises
                </h3>
                <div className="space-y-2">
                  {analysisHistory.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-3 bg-card/50 rounded-lg border border-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          {formatDate(analysis.created_at)}
                        </div>
                        <Badge className={`${
                          analysis.risk_level === 'crítico' ? 'bg-red-500' :
                          analysis.risk_level === 'alto' ? 'bg-orange-500' :
                          analysis.risk_level === 'médio' ? 'bg-yellow-500' :
                          'bg-green-500'
                        } text-white`}>
                          {analysis.risk_level.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold">
                        Score: {analysis.risk_score}/100
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Updated Info */}
            {lastUpdatedBy && lastUpdatedAt && (
              <div className="p-4 bg-card/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    Última atualização por: <span className="font-semibold text-foreground">{lastUpdatedBy}</span>
                    {' '}em {formatDate(lastUpdatedAt)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-border">
          {/* Botão Excluir - Lado Esquerdo */}
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>

          {/* Botões Cancelar e Salvar - Lado Direito */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving || deleting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting || !formData.client_name || !formData.start_date}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Timeline Dialog */}
      <ClientTimelineDialog
        client={client}
        isOpen={showTimeline}
        onClose={() => setShowTimeline(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{client.client_name}</strong>?
              <br />
              <br />
              Esta ação <strong className="text-red-500">NÃO</strong> pode ser desfeita e irá remover:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todas as informações do cliente</li>
                <li>Timeline e eventos ({timelineEvents.length} eventos)</li>
                <li>Boletos cadastrados ({boletos.length} boletos)</li>
                <li>Tags associadas ({selectedTags.length} tags)</li>
                <li>Histórico de análises ({analysisHistory.length} análises)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir cliente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};