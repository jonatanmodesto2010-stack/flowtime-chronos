import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clientInfoSchema } from '@/lib/validations';
import { z } from 'zod';

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

  useEffect(() => {
    setFormData(clientInfo);
    
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
  }, [clientInfo, formData]);

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
              ID do Cliente
            </label>
            <input
              type="text"
              value={formData.clientId || ''}
              onChange={(e) => handleChange('clientId' as keyof ClientInfo, e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: 1040"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
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
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.startDate ? 'border-destructive' : 'border-border'
              }`}
            />
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
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.dueDate ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.dueDate && (
              <p className="text-sm text-destructive mt-1">{errors.dueDate}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
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
