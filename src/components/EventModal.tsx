import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseEventDate, formatEventDate } from '@/lib/date-utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const iconOptions = [
  { value: '💬', label: '💬 Mensagem' },
  { value: '📅', label: '📅 Agendamento' },
  { value: '📄', label: '📄 Boleto' },
  { value: '📞', label: '📞 Ligação' },
  { value: '✅', label: '✅ Pago' },
  { value: '🤝', label: '🤝 Acordo' },
  { value: '⚠️', label: '⚠️ Importante' },
  { value: '👨‍🔧', label: '👨‍🔧 Técnico' },
];

interface Event {
  id: string;
  icon: string;
  iconSize: string;
  date: string;
  description: string;
  position: 'top' | 'bottom';
  status: 'created' | 'resolved' | 'no_response';
  isNew?: boolean;
  time?: string;
  created_at?: string;
}

interface EventModalProps {
  event: Event;
  onSave: (event: Event) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  position?: 'center' | 'left';
}

export const EventModal = ({ event, onSave, onDelete, onCancel, position = 'left' }: EventModalProps) => {
  const [formData, setFormData] = useState(event);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setFormData(event);
    // Parse the date using the centralized function
    if (event.date && event.date !== '--/--') {
      const parsedDate = parseEventDate(event.date);
      if (parsedDate) {
        setSelectedDate(parsedDate);
      }
    }
  }, [event]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = formatEventDate(date);
      setSelectedDate(date);
      setFormData({ ...formData, date: formattedDate });
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave({ ...formData, isNew: false });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      onDelete(event.id);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.isNew) {
      onDelete(event.id);
    } else {
      onCancel();
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      x: position === 'left' ? -120 : 0,
      y: position === 'left' ? 0 : -50, 
      scale: position === 'left' ? 1 : 0.9 
    },
    visible: { 
      opacity: 1, 
      x: 0,
      y: 0, 
      scale: 1
    },
  };

  return (
    <motion.div
      variants={position === 'center' ? backdropVariants : undefined}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className={
        position === 'left' 
          ? 'fixed left-12 top-1/2 -translate-y-1/2 z-50'
          : 'fixed inset-0 bg-[#0a1628]/90 z-50 flex items-center justify-center p-4'
      }
      onClick={position === 'center' ? onCancel : undefined}
    >
      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          duration: 0.5
        }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#1e293b] rounded-2xl shadow-2xl ${
          position === 'left' 
            ? 'w-[420px] border-2 border-[#334155]'
            : 'w-full max-w-2xl border border-[#334155]'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#334155]">
          <h2 className="text-xl font-semibold text-white">
            {event.isNew ? 'Novo Evento' : 'Editar Evento'}
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#334155] transition-colors text-gray-400 hover:text-white"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Ícone</label>
            <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
              <SelectTrigger className="w-full bg-[#0f1729] border-[#334155] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]">
                {iconOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-white hover:bg-[#334155]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-[#0f1729] border-[#334155] text-white hover:bg-[#1e293b]",
                    !selectedDate && "text-gray-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : formData.date || "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#1e293b] border-[#334155]" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Hora</label>
            <input
              type="time"
              value={formData.time || ''}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full p-3 bg-[#0f1729] rounded-md border border-[#334155] text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">
              Descrição
              <span className="float-right text-xs">
                {formData.description.length}/150
              </span>
            </label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              maxLength={150}
              className="w-full p-3 bg-[#0f1729] rounded-md border border-[#334155] h-20 resize-none text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva o evento..."
              autoFocus={event.isNew}
            />
          </div>

          {/* Log de criação */}
          {!event.isNew && event.created_at && (
            <div className="text-xs text-gray-500 border-t border-[#334155] pt-3 mt-2">
              <span className="font-semibold">Criado em:</span>{' '}
              {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm")}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button 
              onClick={handleCancel} 
              className="flex-1 py-2 text-sm font-semibold bg-[#334155] text-gray-300 rounded-lg transition-colors hover:bg-[#475569]"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all hover:scale-105"
            >
              Salvar
            </button>
          </div>
          <button 
            onClick={handleDelete} 
            className="w-full py-2 text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors hover:bg-red-500/20 mt-1"
          >
            Excluir
          </button>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
