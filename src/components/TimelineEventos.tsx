import React from 'react';
import { MessageCircle, Phone, Calendar, XCircle, Clock, Lightbulb } from 'lucide-react';
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
  isLast: boolean;
  onEditar: (evento: Evento) => void;
}

const EventoTimeline: React.FC<EventoTimelineProps> = ({ evento, index, isLast, onEditar }) => {
  const config = getIconConfig(evento.icon);

  return (
    <motion.div 
      className="flex gap-4 mb-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Coluna do Ícone com Linha Vertical */}
      <div className="flex flex-col items-center">
        {/* Ícone Circular */}
        <button
          onClick={() => onEditar(evento)}
          className={`${config.color} w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer shadow-lg z-10`}
          title="Clique para editar"
        >
          {config.component}
        </button>
        
        {/* Linha Vertical */}
        {!isLast && (
          <div className="w-0.5 h-full min-h-[100px] bg-border mt-1"></div>
        )}
      </div>

      {/* Card do Evento */}
      <div className="flex-1 mb-6">
        <div className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors">
          {/* Cabeçalho: Data e Badge */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-card-foreground font-bold text-lg">
              {formatarData(evento.date)}
            </span>
            <span className={`${getStatusColor(evento.status)} text-white text-xs font-medium px-3 py-1 rounded`}>
              {config.label}
            </span>
          </div>

          {/* Descrição */}
          <p className="text-card-foreground text-sm mb-3">
            {evento.description}
          </p>

          {/* Dica de Edição */}
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Lightbulb className="w-4 h-4" />
            <span>Clique no ícone para editar</span>
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
}

export const TimelineEventos: React.FC<TimelineEventosProps> = ({ 
  eventos, 
  onEditarEvento
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      {eventos.length > 0 ? (
        eventos.map((evento, index) => (
          <EventoTimeline
            key={evento.id}
            evento={evento}
            index={index}
            isLast={index === eventos.length - 1}
            onEditar={onEditarEvento}
          />
        ))
      ) : (
        <div className="text-center text-muted-foreground py-12">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum evento registrado</p>
        </div>
      )}
    </div>
  );
};
