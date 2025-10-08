import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomDatePicker } from './CustomDatePicker';
import { eventSchema } from '@/lib/validations';
import { z } from 'zod';

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

const iconOptions = [
  { value: '💬', label: '💬 Mensagem' },
  { value: '📅', label: '📅 Calendário' },
  { value: '📄', label: '📄 Boleto' },
  { value: '📞', label: '📞 Ligação' },
  { value: '✅', label: '✅ Pago' },
];

const iconSizeOptions = [
  { value: 'text-base', label: 'Pequeno' },
  { value: 'text-xl', label: 'Médio' },
  { value: 'text-2xl', label: 'Grande' },
  { value: 'text-3xl', label: 'Extra Grande' },
  { value: 'text-4xl', label: 'Enorme' },
];

export const EventModal = ({ event, onSave, onDelete, onCancel }: EventModalProps) => {
  const [formData, setFormData] = useState(event);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    setFormData(event);
  }, [event]);

  const handleSave = () => {
    try {
      setErrors({});
      eventSchema.parse(formData);
      onSave({ ...formData, isNew: false });
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

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      onDelete(event.id);
    }
  };

  const handleCancel = () => {
    if (event.isNew) {
      onDelete(event.id);
    } else {
      onCancel();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="w-full max-w-sm p-6 bg-card border-2 border-primary/20 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Ícone</label>
              <select 
                value={formData.icon} 
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })} 
                className={`w-full p-2 bg-muted rounded-lg border text-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.icon ? 'border-destructive' : 'border-border'
                }`}
              >
                {iconOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {errors.icon && (
                <p className="text-xs text-destructive mt-1">{errors.icon}</p>
              )}
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Tamanho</label>
              <select 
                value={formData.iconSize || 'text-2xl'} 
                onChange={(e) => setFormData({ ...formData, iconSize: e.target.value })} 
                className={`w-full p-2 bg-muted rounded-lg border text-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.iconSize ? 'border-destructive' : 'border-border'
                }`}
              >
                {iconSizeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {errors.iconSize && (
                <p className="text-xs text-destructive mt-1">{errors.iconSize}</p>
              )}
            </div>
          </div>
          
          <div className="relative">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Data</label>
            <div className="relative">
              <input 
                type="text" 
                value={formData.date}
                readOnly
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`w-full p-2 bg-muted rounded-lg border cursor-pointer pr-10 focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.date ? 'border-destructive' : 'border-border'
                }`}
                placeholder="DD/MM"
              />
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="18" height="20" viewBox="0 0 18 20" fill="currentColor">
                  <rect x="1" y="4" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <line x1="1" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="5" y1="2" x2="5" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="13" y1="2" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {errors.date && (
              <p className="text-xs text-destructive mt-1">{errors.date}</p>
            )}
            <AnimatePresence>
              {showDatePicker && (
                <CustomDatePicker 
                  value={formData.date}
                  onChange={(date) => {
                    setFormData({ ...formData, date });
                    setShowDatePicker(false);
                  }}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </AnimatePresence>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Descrição</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              className={`w-full p-2 bg-muted rounded-lg border h-20 resize-none text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.description ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
          </div>
          
          <div className="flex gap-2 mt-2">
            <motion.button 
              onClick={handleSave} 
              className="flex-1 py-2 text-sm font-semibold text-primary-foreground bg-gradient-primary rounded-lg transition-all"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Salvar
            </motion.button>
            <motion.button 
              onClick={handleCancel} 
              className="flex-1 py-2 text-sm font-semibold bg-secondary text-secondary-foreground rounded-lg transition-all"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              Cancelar
            </motion.button>
          </div>
          <motion.button 
            onClick={handleDelete} 
            className="w-full py-2 text-sm font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-lg transition-all mt-1"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            Excluir
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
