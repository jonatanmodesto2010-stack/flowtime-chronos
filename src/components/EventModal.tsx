import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgreementIcon } from '@/components/icons/AgreementIcon';

const iconOptions = [
  { value: '💬', label: '💬 Mensagem' },
  { value: '📅', label: '📅 Calendário' },
  { value: '📄', label: '📄 Boleto' },
  { value: '📞', label: '📞 Ligação' },
  { value: '✅', label: '✅ Pago' },
  { value: 'agreement', label: 'Acordo', icon: AgreementIcon },
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
}

interface EventModalProps {
  event: Event;
  onSave: (event: Event) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

export const EventModal = ({ event, onSave, onDelete, onCancel }: EventModalProps) => {
  const [formData, setFormData] = useState(event);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setFormData(event);
    // Try to parse the date if it's in DD/MM format
    if (event.date && event.date !== '--/--') {
      const [day, month] = event.date.split('/');
      if (day && month) {
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      }
    }
  }, [event]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'dd/MM', { locale: ptBR });
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
    hidden: { opacity: 0, y: -50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        variants={modalVariants}
        className="w-full max-w-sm p-6 bg-card border border-border rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Ícone</label>
            <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
              <SelectTrigger className="w-full bg-background">
                <div className="flex items-center gap-2">
                  {(() => {
                    const selected = iconOptions.find(opt => opt.value === formData.icon);
                    if (selected?.icon) {
                      const IconComponent = selected.icon;
                      return (
                        <>
                          <IconComponent className="h-4 w-4" size={16} />
                          <span>{selected.label}</span>
                        </>
                      );
                    }
                    return <span>{selected?.label || formData.icon || 'Selecione um ícone'}</span>;
                  })()}
                </div>
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon ? (
                        <>
                          <opt.icon className="h-4 w-4" size={16} />
                          <span>{opt.label}</span>
                        </>
                      ) : (
                        <span>{opt.label}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM", { locale: ptBR }) : formData.date || "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Descrição</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              className="w-full p-3 bg-background rounded-md border border-border h-20 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Descreva o evento..."
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={handleSave} 
              className="flex-1 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg transition-transform hover:scale-105"
            >
              Salvar
            </button>
            <button 
              onClick={handleCancel} 
              className="flex-1 py-2 text-sm font-semibold bg-muted text-muted-foreground rounded-lg transition-colors hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
          <button 
            onClick={handleDelete} 
            className="w-full py-2 text-sm font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors hover:bg-red-500/20 mt-1"
          >
            Excluir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
