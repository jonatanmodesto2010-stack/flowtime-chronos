import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const iconOptions = [
  { value: '💬', label: '💬 Mensagem' },
  { value: '📅', label: '📅 Calendário' },
  { value: '📄', label: '📄 Boleto' },
  { value: '📞', label: '📞 Ligação' },
  { value: '✅', label: '✅ Pago' },
];

interface Event {
  id: string;
  icon: string;
  iconSize?: string;
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

  useEffect(() => {
    setFormData(event);
  }, [event]);

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
        className="w-full max-w-sm p-6 bg-card border-2 border-purple-500/20 dark:border-purple-500/30 rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Ícone</label>
            <select 
              value={formData.icon} 
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })} 
              className="w-full p-2 mt-1 bg-secondary rounded-md border border-border"
            >
              {iconOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Data</label>
            <input 
              type="text" 
              value={formData.date} 
              onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
              className="w-full p-2 mt-1 bg-secondary rounded-md border border-border" 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Descrição</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
              className="w-full p-2 mt-1 bg-secondary rounded-md border border-border h-20 resize-none"
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
