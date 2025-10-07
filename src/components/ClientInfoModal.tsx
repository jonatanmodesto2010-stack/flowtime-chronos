import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ClientInfo {
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

  useEffect(() => {
    setFormData(clientInfo);
  }, [clientInfo]);

  const handleSave = () => {
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  const handleChange = (field: keyof ClientInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6 relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar modal"
        >
          <X size={20} />
        </button>

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
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Digite o nome do cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Data de Início
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Data de Vencimento
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-primary text-primary-foreground font-semibold rounded-lg hover:scale-105 transition-transform shadow-lg"
          >
            Salvar
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
