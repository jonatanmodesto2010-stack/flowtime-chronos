import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Clock, User, MessageSquare, FileText, CheckCircle2, AlertCircle, Info, Phone, Wrench, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimelineItem from '@/components/TimelineItem';
import AddEventDialog from '@/components/AddEventDialog';
import EditEventDialog from '@/components/EditEventDialog';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VisualTimeline = () => {
  const [searchParams] = useSearchParams();
  const timelineId = searchParams.get('id');

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (timelineId) {
      loadTimelineData();
    }
  }, [timelineId]);

  // Função helper para processar datas do formato DD/MM para ISO
  const parseEventDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Se já estiver no formato ISO (YYYY-MM-DD), usar diretamente
    if (dateStr.includes('-')) return dateStr;
    
    // Se estiver no formato DD/MM, adicionar ano atual
    const [day, month] = dateStr.split('/');
    if (!day || !month) return null;
    
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const loadTimelineData = async () => {
    try {
      setLoading(true);

      // Carregar informações do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('client_timelines')
        .select('*')
        .eq('id', timelineId)
        .single();

      if (clientError) throw clientError;
      setClientInfo(clientData);

      // Carregar linhas da timeline
      const { data: linesData, error: linesError } = await supabase
        .from('timeline_lines')
        .select('id')
        .eq('timeline_id', timelineId)
        .order('position', { ascending: true });

      if (linesError) throw linesError;

      // Carregar eventos de todas as linhas
      const allEvents = [];
      for (const line of linesData) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('timeline_events')
          .select('*')
          .eq('line_id', line.id)
          .order('event_order', { ascending: true });

        if (eventsError) throw eventsError;

        // Mapear eventos para o formato esperado pela UI
        const mappedEvents = eventsData.map(event => ({
          id: event.id,
          type: getEventType(event.icon),
          title: event.description?.substring(0, 30) + (event.description?.length > 30 ? '...' : ''),
          description: event.description || 'Sem descrição',
          date: parseEventDate(event.event_date),
          time: event.event_time || null,
          user: 'Sistema',
          status: event.status === 'completed' ? 'completed' : event.status === 'warning' ? 'warning' : 'info',
          icon: event.icon,
          color: getEventColor(event.status),
          originalEvent: event
        }));

        allEvents.push(...mappedEvents);
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "❌ Erro ao carregar eventos",
        description: "Não foi possível carregar os eventos da timeline.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventType = (icon) => {
    const iconMap = {
      '📅': 'calendar',
      '📝': 'note',
      '✅': 'check',
      '⚠️': 'alert',
      '📞': 'phone',
      '🔧': 'wrench',
      '💬': 'message',
    };
    return iconMap[icon] || 'note';
  };

  const getEventColor = (status) => {
    switch (status) {
      case 'completed':
      case 'resolved':
        return 'green';
      case 'warning':
      case 'no_response':
        return 'red';
      case 'pending':
      case 'created':
      default:
        return 'yellow';
    }
  };

  const handleAddEvent = (newEvent) => {
    const event = {
      ...newEvent,
      id: Date.now(),
      title: newEvent.description.substring(0, 30) + '...',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      color: 'green'
    };
    
    setEvents([event, ...events]);
    setIsAddDialogOpen(false);
    
    toast({
      title: "✨ Evento adicionado!",
      description: "Seu novo evento foi adicionado à timeline com sucesso!",
      duration: 3000,
    });
  };

  const handleUpdateEvent = (updatedEvent) => {
    setEvents(events.map(event => event.id === updatedEvent.id ? updatedEvent : event));
    setIsEditDialogOpen(false);
    setEditingEvent(null);
    toast({
      title: "✅ Evento atualizado!",
      description: "As informações do evento foram salvas.",
      duration: 3000,
    });
  };

  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
    setIsEditDialogOpen(false);
    setEditingEvent(null);
    toast({
      title: "🗑️ Evento excluído!",
      description: "O evento foi removido da timeline.",
      variant: "destructive",
      duration: 3000,
    });
  };

  const handleOpenEditDialog = (event) => {
    setEditingEvent(event);
    setIsEditDialogOpen(true);
  };

  const handleColorChange = (eventId) => {
    setEvents(events.map(event => {
      if (event.id === eventId) {
        const colors = ['green', 'yellow', 'red'];
        const currentColorIndex = colors.indexOf(event.color);
        const nextColorIndex = (currentColorIndex + 1) % colors.length;
        return { ...event, color: colors[nextColorIndex] };
      }
      return event;
    }));
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(event => event.type === filter);

  const filterButtons = [
    { value: 'all', label: 'Todos', icon: FileText },
    { value: 'meeting', label: 'Reuniões', icon: Calendar },
    { value: 'task', label: 'Tarefas', icon: CheckCircle2 },
    { value: 'note', label: 'Notas', icon: MessageSquare },
    { value: 'alert', label: 'Alertas', icon: AlertCircle },
    { value: 'call', label: 'Ligações', icon: Phone },
    { value: 'maintenance', label: 'Manutenção', icon: Wrench },
  ];

  if (!timelineId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4 flex items-center justify-center">
        <div className="glass-effect rounded-xl p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
          <h3 className="text-2xl font-bold text-gray-300 mb-2">
            ID do Cliente Não Encontrado
          </h3>
          <p className="text-gray-400 mb-6">
            Por favor, acesse esta página através do dashboard do cliente.
          </p>
          <Button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <div className="glass-effect rounded-2xl p-6 mb-4 border-2 border-purple-500/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => window.history.back()}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-purple-500/20 hover:text-purple-400 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-1">
                    {clientInfo?.client_name || 'Timeline do Cliente'}
                  </h1>
                  <p className="text-gray-300 text-base">
                    {clientInfo ? `ID: ${clientInfo.client_id || 'N/A'}` : 'Acompanhe todas as atividades e eventos em ordem cronológica'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-5 py-5 rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 glow-effect"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Evento
              </Button>
            </div>
          </div>

          <div className="glass-effect rounded-xl p-3 mb-4">
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <motion.button
                    key={btn.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilter(btn.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
                      filter === btn.value
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {btn.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="glass-effect rounded-xl p-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto mb-4 text-purple-400 animate-spin" />
              <h3 className="text-2xl font-bold text-gray-300 mb-2">
                Carregando eventos...
              </h3>
              <p className="text-gray-400">
                Aguarde enquanto buscamos os dados da timeline
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-[1000px] bg-gradient-to-b from-purple-500 via-pink-500 to-blue-500 rounded-full opacity-30"></div>
            
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => (
                <TimelineItem 
                  key={event.id} 
                  event={event} 
                  index={index}
                  onEdit={() => handleOpenEditDialog(event)}
                  onColorChange={() => handleColorChange(event.id)}
                />
              ))}
            </AnimatePresence>

            {filteredEvents.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-effect rounded-xl p-12 text-center"
              >
                <Info className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-2xl font-bold text-gray-300 mb-2">
                  Nenhum evento encontrado
                </h3>
                <p className="text-gray-400">
                  {filter === 'all' 
                    ? 'Adicione eventos para começar a construir sua timeline' 
                    : 'Tente ajustar os filtros ou adicione um novo evento'}
                </p>
              </motion.div>
            )}
          </div>
        )}

        <AddEventDialog 
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onAdd={handleAddEvent}
        />

        {editingEvent && (
          <EditEventDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onUpdate={handleUpdateEvent}
            onDelete={() => handleDeleteEvent(editingEvent.id)}
            event={editingEvent}
          />
        )}
      </div>
    </div>
  );
};

export default VisualTimeline;
