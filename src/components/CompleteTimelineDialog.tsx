import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface CompleteTimelineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string, createNew: boolean) => Promise<void>;
  clientName: string;
}

export const CompleteTimelineDialog = ({
  isOpen,
  onClose,
  onConfirm,
  clientName,
}: CompleteTimelineDialogProps) => {
  const [notes, setNotes] = useState('');
  const [createNew, setCreateNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('[CompleteTimelineDialog] 📂 Modal aberto para cliente:', clientName);
    }
  }, [isOpen, clientName]);

  const handleConfirm = async () => {
    if (!notes.trim() || notes.trim().length < 10) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(notes.trim(), createNew);
      setNotes('');
      setCreateNew(false);
      onClose();
    } catch (error) {
      console.error('[CompleteTimelineDialog] Erro ao confirmar:', error);
      // Não fecha o modal se houver erro
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNotes('');
    setCreateNew(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Finalizar Cobrança
          </DialogTitle>
          <DialogDescription>
            Você está finalizando a timeline de <strong>{clientName}</strong>.
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Observações *</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Cliente pagou integral, negociação bem-sucedida..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={!notes.trim() ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Descreva o motivo da conclusão da timeline (mínimo 10 caracteres)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="createNew"
              checked={createNew}
              onCheckedChange={(checked) => setCreateNew(checked as boolean)}
            />
            <Label
              htmlFor="createNew"
              className="text-sm font-normal cursor-pointer"
            >
              Criar nova timeline ativa para este cliente
            </Label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!notes.trim() || notes.trim().length < 10 || isSubmitting}
            className="bg-green-500 hover:bg-green-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Finalizando...
              </>
            ) : (
              'Confirmar Finalização'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
