import React from 'react';
import { MessageCircle, Phone, Calendar, XCircle, Clock, Edit2, Trash2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ==================== TYPES ====================
interface Evento {
  id: string;
  icon: string;
  date: string;
  time?: string;
  description: string;
  status: 'created' | 'resolved' | 'no_response';
}

// ==================== FUNÇÃO PARA FORMATAR DATA ====================
const formatarData = (data: string): string => {
  try {
    const d = new Date(data);
    return format(d, 'dd/MM', { locale: ptBR });
  } catch {
    return data;
  }
};

const formatarDataCompleta = (data: string): string => {
  try {
    const d = new Date(data);
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return data;
  }
};

// ==================== MAPEAMENTO DE ÍCONES E CORES ====================
const getIconConfig = (icon: string) => {
  const iconMap: Record<string, { component: JSX.Element; color: string; label: string }> = {
    '💬': { component: <MessageCircle size={20} />, color: 'bg-primary', label: 'Mensagem' },
    '📞': { component: <Phone size={20} />, color: 'bg-[hsl(var(--status-resolved))]', label: 'Ligação' },
    '📅': { component: <Calendar size={20} />, color: 'bg-secondary', label: 'Agendamento' },
    '❌': { component: <XCircle size={20} />, color: 'bg-[hsl(var(--status-no-response))]', label: 'Cancelamento' },
    '🔴': { component: <XCircle size={20} />, color: 'bg-[hsl(var(--status-no-response))]', label: 'Cancelado' },
    '⚠️': { component: <Clock size={20} />, color: 'bg-destructive', label: 'Importante' },
    '📄': { component: <Clock size={20} />, color: 'bg-muted', label: 'Boleto' },
    '🟢': { component: <Clock size={20} />, color: 'bg-[hsl(var(--status-resolved))]', label: 'Pago' },
    '🤝': { component: <Clock size={20} />, color: 'bg-accent', label: 'Acordo' },
    '👨‍🔧': { component: <Clock size={20} />, color: 'bg-muted', label: 'Técnico' },
  };
  
  return iconMap[icon] || { component: <Clock size={20} />, color: 'bg-muted', label: 'Evento' };
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'resolved':
      return 'bg-[hsl(var(--status-resolved))]';
    case 'no_response':
      return 'bg-[hsl(var(--status-no-response))]';
    default:
      return 'bg-primary';
  }
};

// ==================== COMPONENTE EVENTO TIMELINE ====================
interface EventoTimelineProps {
  evento: Evento;
  index: number;
  onEditar: (evento: Evento) => void;
  onExcluir: (evento: Evento) => void;
}

const EventoTimeline: React.FC<EventoTimelineProps> = ({ evento, index, onEditar, onExcluir }) => {
  const config = getIconConfig(evento.icon);

  return (
    <motion.div 
      className="flex gap-4 items-start mb-6 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Coluna vazia à esquerda */}
      <div className="flex-1"></div>
      
      {/* Ícone Central */}
      <div className="relative flex flex-col items-center">
        <button
          onClick={() => onEditar(evento)}
          className={`${config.color} p-2 rounded-full text-white hover:scale-110 transition-all duration-300 cursor-pointer hover:shadow-lg`}
          title="Clique para editar"
        >
          {config.component}
        </button>
        {/* Linha vertical */}
        <div className="w-0.5 flex-1 bg-border absolute top-10 bottom-0"></div>
      </div>
      
      {/* Card do Evento à Direita */}
      <div className="flex-1">
        <div className="bg-card rounded-2xl p-5 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:transform hover:scale-[1.02]">
          <div className="flex items-start justify-between gap-3">
            {/* Conteúdo do Evento */}
            <div className="flex-1">
              {/* Data e Badge do Tipo */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-bold text-card-foreground">
                  {formatarData(evento.date)}
                </span>
                {evento.time && (
                  <span className="text-xs text-muted-foreground">
                    {evento.time}
                  </span>
                )}
                <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(evento.status)} text-white font-semibold`}>
                  {config.label}
                </span>
              </div>
              
              {/* Data completa */}
              <div className="text-xs font-semibold text-muted-foreground mb-3">
                {formatarDataCompleta(evento.date)}
              </div>
              
              {/* Descrição */}
              <p className="text-sm text-card-foreground leading-relaxed mb-4">
                {evento.description}
              </p>
              
              {/* Dica */}
              <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Clique no ícone para editar
                </span>
              </div>
            </div>
            
            {/* Botões de Ação (aparecem no hover) */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => onEditar(evento)}
                className="p-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded transition-all duration-300 hover:scale-110"
                title="Editar evento"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onExcluir(evento)}
                className="p-1.5 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded transition-all duration-300 hover:scale-110"
                title="Excluir evento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== COMPONENTE PRINCIPAL DA TIMELINE ====================
interface TimelineEventosProps {
  eventos: Evento[];
  onEditarEvento: (evento: Evento) => void;
  onExcluirEvento: (evento: Evento) => void;
}

export const TimelineEventos: React.FC<TimelineEventosProps> = ({ 
  eventos, 
  onEditarEvento, 
  onExcluirEvento 
}) => {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="relative">
        {eventos.length > 0 ? (
          eventos.map((evento, index) => (
            <EventoTimeline
              key={evento.id}
              evento={evento}
              index={index}
              onEditar={onEditarEvento}
              onExcluir={onExcluirEvento}
            />
          ))
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum evento registrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
