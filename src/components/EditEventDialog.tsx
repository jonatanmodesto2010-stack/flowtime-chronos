import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Calendar, MessageSquare, CheckCircle2, AlertCircle, GripVertical, Trash2, Phone, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const EditEventDialog = ({ isOpen, onClose, onUpdate, onDelete, event }) => {
  const [formData, setFormData] = useState({ ...event });

  useEffect(() => {
    if (event) {
      setFormData({ ...event });
    }
  }, [event]);

  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  const eventTypes = [
    { value: 'meeting', label: 'Reunião', icon: Calendar },
    { value: 'task', label: 'Tarefa', icon: CheckCircle2 },
    { value: 'note', label: 'Nota', icon: MessageSquare },
    { value: 'alert', label: 'Alerta', icon: AlertCircle },
    { value: 'call', label: 'Ligação', icon: Phone },
    { value: 'maintenance', label: 'Manutenção', icon: Wrench },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.description) {
      onUpdate({
        ...formData,
        title: formData.description.substring(0, 30) + '...',
      });
    }
  };

  const handleTypeChange = (type) => {
    const iconMap = {
      meeting: 'calendar',
      task: 'check',
      note: 'message',
      alert: 'alert',
      call: 'phone',
      maintenance: 'wrench'
    };
    setFormData({ ...formData, type, icon: iconMap[type] });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            ref={constraintsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            drag
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={constraintsRef}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 top-[10%] -translate-x-1/2 w-full max-w-2xl z-50 p-4 cursor-grab"
          >
            <div className="glass-effect rounded-2xl p-8 border-2 border-purple-500/30 shadow-2xl">
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="flex items-center justify-between mb-6 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-6 w-6 text-gray-500" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Editar Evento
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="description" className="text-gray-300 mb-2 block">
                    Descrição
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o evento..."
                    className="bg-white/5 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500 min-h-[100px]"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-3 block">
                    Tipo de Evento
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {eventTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <motion.button
                          key={type.value}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleTypeChange(type.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 ${
                            formData.type === type.value
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-sm font-medium">{type.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => onDelete(event.id)}
                    variant="destructive"
                    className="bg-red-500/80 hover:bg-red-500 text-white"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                  <div className="flex-grow"></div>
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="outline"
                    className="bg-white/5 border-gray-600 text-gray-300 hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-green-500/50"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditEventDialog;
