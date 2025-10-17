import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseEventDate } from '@/lib/date-utils';

interface MessageCardProps {
  icon: string;
  date: string;
  time?: string;
  description: string;
  status: 'created' | 'resolved' | 'no_response';
  onClick?: () => void;
  className?: string;
}

const getStatusLabel = (icon: string): string => {
  const iconMap: Record<string, string> = {
    '💬': 'Mensagem',
    '📅': 'Agendamento',
    '📄': 'Boleto',
    '📞': 'Ligação',
    '🟢': 'Pago',
    '🤝': 'Acordo',
    '⚠️': 'Importante',
    '👨‍🔧': 'Técnico',
  };
  return iconMap[icon] || 'Evento';
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

export const MessageCard = ({ 
  icon, 
  date, 
  time, 
  description, 
  status,
  onClick,
  className = '' 
}: MessageCardProps) => {
  // Parsear data para formato completo DD/MM/AAAA
  const parsedDate = parseEventDate(date);
  const fullDate = parsedDate 
    ? format(parsedDate, 'dd/MM/yyyy', { locale: ptBR })
    : date;
  
  const shortDate = parsedDate
    ? format(parsedDate, 'dd/MM', { locale: ptBR })
    : date;

  return (
    <motion.div
      onClick={onClick}
      className={`
        bg-card rounded-2xl p-5 
        border border-border
        shadow-lg hover:shadow-xl
        transition-all duration-300
        cursor-pointer
        hover:scale-[1.02]
        hover:border-primary/50
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      {/* Header: Data e Badge */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-sm font-bold text-card-foreground">
            {shortDate}
          </span>
          {time && (
            <span className="text-xs text-muted-foreground">
              {time}
            </span>
          )}
        </div>
        
        <Badge 
          className={`${getStatusColor(status)} text-white px-3 py-1 text-xs font-semibold rounded-full`}
        >
          {getStatusLabel(icon)}
        </Badge>
      </div>

      {/* Data completa */}
      <div className="text-xs font-semibold text-muted-foreground mb-3">
        {fullDate}
      </div>

      {/* Descrição */}
      <p className="text-sm text-card-foreground leading-relaxed mb-4">
        {description}
      </p>

      {/* Footer: Nota com ícone */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
        <Lightbulb className="w-4 h-4 text-primary" />
        <span className="text-xs text-muted-foreground">
          Clique no ícone para editar
        </span>
      </div>
    </motion.div>
  );
};
