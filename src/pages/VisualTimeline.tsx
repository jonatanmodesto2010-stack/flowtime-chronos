import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Clock, User, MessageSquare, FileText, CheckCircle2, AlertCircle, Info, Phone, Wrench, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TimelineItem from '@/components/TimelineItem';
import AddEventDialog from '@/components/AddEventDialog';
import EditEventDialog from '@/components/EditEventDialog';
import { toast } from '@/components/ui/use-toast';

const VisualTimeline = () => {
  const [events, setEvents] = useState([
    { id: 1, type: 'meeting', title: 'Reunião de Kickoff', description: 'Definição de escopo e objetivos.', date: '2024-01-15', time: '14:00', user: 'Maria Silva', status: 'completed', icon: 'calendar', color: 'green' },
    { id: 2, type: 'note', title: 'Anotações da Reunião', description: 'Cliente solicitou novas funcionalidades.', date: '2024-01-15', time: '16:30', user: 'João Santos', status: 'info', icon: 'message', color: 'yellow' },
    { id: 3, type: 'task', title: 'Desenvolvimento da UI', description: 'Criação dos mockups e protótipos.', date: '2024-01-18', time: '10:00', user: 'Ana Costa', status: 'completed', icon: 'check', color: 'green' },
    { id: 4, type: 'message', title: 'Feedback do Cliente', description: 'Designs aprovados com pequenas alterações.', date: '2024-01-20', time: '11:45', user: 'Carlos Mendes', status: 'info', icon: 'message', color: 'yellow' },
    { id: 5, type: 'alert', title: 'Prazo Importante', description: 'Entrega da v1 na próxima semana.', date: '2024-01-21', time: '09:00', user: 'Sistema', status: 'warning', icon: 'alert', color: 'red' },
    { id: 6, type: 'task', title: 'Implementação do Backend', description: 'Configuração inicial do banco de dados.', date: '2024-01-22', time: '14:00', user: 'Pedro Lima', status: 'info', icon: 'check', color: 'green' },
    { id: 7, type: 'meeting', title: 'Reunião de Alinhamento', description: 'Sincronização da equipe de desenvolvimento.', date: '2024-01-25', time: '10:30', user: 'Maria Silva', status: 'info', icon: 'calendar', color: 'yellow' },
    { id: 8, type: 'alert', title: 'Atualização de Segurança', description: 'Patch de segurança aplicado ao servidor.', date: '2024-01-26', time: '18:00', user: 'Sistema', status: 'warning', icon: 'alert', color: 'red' },
    { id: 9, type: 'note', title: 'Ideias para v2', description: 'Brainstorm de novas funcionalidades futuras.', date: '2024-01-28', time: '15:00', user: 'Ana Costa', status: 'info', icon: 'message', color: 'green' },
    { id: 10, type: 'task', title: 'Testes de Integração', description: 'Verificação da comunicação entre frontend e backend.', date: '2024-01-29', time: '11:00', user: 'João Santos', status: 'info', icon: 'check', color: 'yellow' },
    { id: 11, type: 'completed', title: 'Entrega da v1', description: 'Primeira versão do projeto entregue ao cliente.', date: '2024-01-30', time: '17:00', user: 'Carlos Mendes', status: 'completed', icon: 'check', color: 'green' },
    { id: 12, type: 'call', title: 'Ligação para Cliente', description: 'Acompanhamento pós-venda e feedback.', date: '2024-02-01', time: '10:00', user: 'Mariana Souza', status: 'info', icon: 'phone', color: 'yellow' },
    { id: 13, type: 'maintenance', title: 'Manutenção no Servidor', description: 'Aplicação de atualizações de rotina.', date: '2024-02-02', time: '22:00', user: 'Sistema', status: 'info', icon: 'wrench', color: 'red' },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filter, setFilter] = useState('all');

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
                    Timeline do Cliente
                  </h1>
                  <p className="text-gray-300 text-base">
                    Acompanhe todas as atividades e eventos em ordem cronológica
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

          {filteredEvents.length === 0 && (
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
                Tente ajustar os filtros ou adicione um novo evento
              </p>
            </motion.div>
          )}
        </div>

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
