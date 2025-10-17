import React from 'react';
import { MessageCircle, Phone, Calendar, XCircle, Clock } from 'lucide-react';
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
  const iconMap: Record<string, { component: React.ReactNode; iconColor: string; badgeColor: string; label: string }> = {
    '💬': { 
      component: <MessageCircle size={20} />, 
      iconColor: 'bg-[#3b82f6]', // Azul
      badgeColor: 'bg-[#3b82f6]', 
      label: 'Mensagem' 
    },
    '📞': { 
      component: <Phone size={20} />, 
      iconColor: 'bg-[#10b981]', // Verde
      badgeColor: 'bg-[#10b981]', 
      label: 'Ligação' 
    },
    '📅': { 
      component: <Calendar size={20} />, 
      iconColor: 'bg-[#a855f7]', // Roxo
      badgeColor: 'bg-[#a855f7]', 
      label: 'Reunião' 
    },
    '❌': { 
      component: <XCircle size={20} />, 
      iconColor: 'bg-[#ef4444]', // Vermelho
      badgeColor: 'bg-[#ef4444]', 
      label: 'Cancelamento' 
    },
    '🔴': { 
      component: <XCircle size={20} />, 
      iconColor: 'bg-[#ef4444]', 
      badgeColor: 'bg-[#ef4444]', 
      label: 'Cancelado' 
    },
    '⚠️': { 
      component: <Clock size={20} />, 
      iconColor: 'bg-[#f59e0b]', // Laranja
      badgeColor: 'bg-[#f59e0b]', 
      label: 'Importante' 
    },
    '📄': { 
      component: <Clock size={20} />, 
      iconColor: 'bg-[#6b7280]', // Cinza
      badgeColor: 'bg-[#6b7280]', 
      label: 'Boleto' 
    },
    '🟢': { 
      component: <Clock size={20} />, 
      iconColor: 'bg-[#10b981]', 
      badgeColor: 'bg-[#10b981]', 
      label: 'Pago' 
    },
    '🤝': { 
      component: <Clock size={20} />, 
      iconColor: 'bg-[#8b5cf6]', 
      badgeColor: 'bg-[#8b5cf6]', 
      label: 'Acordo' 
    },
    '👨‍🔧': { 
      component: <Clock size={20} />, 
      iconColor: 'bg-[#6b7280]', 
      badgeColor: 'bg-[#6b7280]', 
      label: 'Técnico' 
    },
  };
  
  return iconMap[icon] || { 
    component: <Clock size={20} />, 
    iconColor: 'bg-[#6b7280]', 
    badgeColor: 'bg-[#6b7280]', 
    label: 'Evento' 
  };
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
      className="flex gap-4 mb-8"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
    >
      {/* Coluna do Ícone com Linha Vertical */}
      <div className="flex flex-col items-center">
        {/* Ícone Circular */}
        <button
          onClick={() => onEditar(evento)}
          className={`${config.iconColor} w-12 h-12 rounded-full flex items-center justify-center text-white hover:scale-110 hover:shadow-2xl transition-transform duration-300 cursor-pointer shadow-lg z-10 flex-shrink-0`}
          title="Clique para editar"
          aria-label={`Editar evento de ${config.label}`}
        >
          {config.component}
        </button>
        
        {/* Linha Vertical */}
        {!isLast && (
          <div className="w-[2px] h-full min-h-[120px] bg-[#334155] mt-3"></div>
        )}
      </div>

      {/* Card do Evento */}
      <div className="flex-1 mb-6">
        <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] hover:border-[#475569] transition-all duration-300 hover:shadow-lg" role="article" aria-label={`Evento de ${formatarData(evento.date)}`}>
          {/* Cabeçalho: Data e Badge */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg font-semibold text-white">
              {formatarData(evento.date)}
            </span>
            <span className={`${config.badgeColor} text-white text-xs font-medium px-3 py-1.5 rounded-md`}>
              {config.label}
            </span>
          </div>

          {/* Descrição */}
          <p className="text-sm text-[#94a3b8] mb-3 leading-relaxed">
            {evento.description}
          </p>

          {/* Dica de Edição */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
            <span>💡</span>
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
    <div className="min-h-screen bg-[#0a1628] p-8">
      <div className="max-w-5xl mx-auto">
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
          <div className="text-center text-[#94a3b8] py-12">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum evento registrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
