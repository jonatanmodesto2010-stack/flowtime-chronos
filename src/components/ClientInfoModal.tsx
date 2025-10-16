import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toISODate } from '@/lib/date-utils';
import { clientInfoSchema } from '@/lib/validations';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ClientInfo {
  clientId?: string;
  name: string;
  startDate: string;
  boletoValue: string;
  dueDate: string;
}

interface ClientInfoModalProps {
  clientInfo: ClientInfo;
  onSave: (info: ClientInfo) => void;
  onCancel: () => void;
}

export const ClientInfoModal = ({ clientInfo, onSave, onCancel }: ClientInfoModalProps) => {
  const [formData, setFormData] = useState<ClientInfo>(clientInfo);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(undefined);
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setFormData(clientInfo);
    
    // Parse startDate string (ISO format YYYY-MM-DD) → Date object
    if (clientInfo.startDate && clientInfo.startDate.trim() !== '') {
      const date = new Date(clientInfo.startDate);
      if (!isNaN(date.getTime())) {
        setSelectedStartDate(date);
      }
    } else {
      setSelectedStartDate(undefined);
    }
    
    // Parse dueDate string (ISO format YYYY-MM-DD) → Date object
    if (clientInfo.dueDate && clientInfo.dueDate.trim() !== '') {
      const date = new Date(clientInfo.dueDate);
      if (!isNaN(date.getTime())) {
        setSelectedDueDate(date);
      }
    } else {
      setSelectedDueDate(undefined);
    }
    
    // Proteção contra atualização de página com dados não salvos
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges = 
        formData.name !== clientInfo.name ||
        formData.startDate !== clientInfo.startDate ||
        formData.boletoValue !== clientInfo.boletoValue ||
        formData.dueDate !== clientInfo.dueDate;
      
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [clientInfo]);

  const handleSave = () => {
    try {
      setErrors({});
      clientInfoSchema.parse(formData);
      onSave(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleChange = (field: keyof ClientInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      // Date → ISO string (YYYY-MM-DD) para backend
      const isoDate = toISODate(date);
      setSelectedStartDate(date);
      handleChange('startDate', isoDate);
      setStartDateOpen(false);
    }
  };

  const handleDueDateSelect = (date: Date | undefined) => {
    if (date) {
      // Date → ISO string (YYYY-MM-DD) para backend
      const isoDate = toISODate(date);
      setSelectedDueDate(date);
      handleChange('dueDate', isoDate);
      setDueDateOpen(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6 relative"
        initial={{ scale: 0.9, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
      >

        <h2 className="text-2xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          Informações do Cliente
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              maxLength={150}
              className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.name ? 'border-destructive' : 'border-border'
              }`}
              placeholder="Digite o nome do cliente"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Data de Início
            </label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal px-4 py-2 h-auto",
                    !selectedStartDate && "text-muted-foreground",
                    errors.startDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedStartDate 
                    ? format(selectedStartDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedStartDate}
                  onSelect={handleStartDateSelect}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.startDate && (
              <p className="text-sm text-destructive mt-1">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Valor do Boleto (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.boletoValue}
              onChange={(e) => handleChange('boletoValue', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.boletoValue ? 'border-destructive' : 'border-border'
              }`}
              placeholder="0.00"
            />
            {errors.boletoValue && (
              <p className="text-sm text-destructive mt-1">{errors.boletoValue}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Data de Vencimento
            </label>
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal px-4 py-2 h-auto",
                    !selectedDueDate && "text-muted-foreground",
                    errors.dueDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDueDate 
                    ? format(selectedDueDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDueDate}
                  onSelect={handleDueDateSelect}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.dueDate && (
              <p className="text-sm text-destructive mt-1">{errors.dueDate}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <motion.button
            onClick={onCancel}
            className="w-full px-6 py-3 bg-muted text-foreground font-semibold rounded-lg shadow-lg transition-all"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            Cancelar
          </motion.button>
          <motion.button
            onClick={handleSave}
            className="w-full px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-lg shadow-lg transition-all"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            Salvar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
