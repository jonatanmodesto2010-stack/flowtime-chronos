import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganizationIcons } from '@/hooks/useOrganizationIcons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const IconsManagement = () => {
  const { organizationId, canManageSettings } = useUserRole();
  const { icons, isLoading, refetch } = useOrganizationIcons();
  const { toast } = useToast();
  
  const [newIcon, setNewIcon] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [iconToDelete, setIconToDelete] = useState<string | null>(null);

  const handleAddIcon = async () => {
    if (!newIcon.trim() || !organizationId) {
      toast({
        title: 'Erro',
        description: 'Digite um ícone válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('organization_icons')
        .insert({
          organization_id: organizationId,
          icon: newIcon.trim(),
          label: newLabel.trim() || null,
        });

      if (error) throw error;

      toast({
        title: 'Ícone adicionado',
        description: 'O novo ícone foi criado com sucesso.',
      });

      setNewIcon('');
      setNewLabel('');
      refetch();
    } catch (error: any) {
      console.error('Error adding icon:', error);
      if (error.code === '23505') {
        toast({
          title: 'Erro',
          description: 'Este ícone já existe na organização.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível adicionar o ícone.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteIcon = async () => {
    if (!iconToDelete) return;

    try {
      const { error } = await supabase
        .from('organization_icons')
        .delete()
        .eq('id', iconToDelete);

      if (error) throw error;

      toast({
        title: 'Ícone removido',
        description: 'O ícone foi excluído com sucesso.',
      });

      refetch();
    } catch (error) {
      console.error('Error deleting icon:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o ícone.',
        variant: 'destructive',
      });
    } finally {
      setIconToDelete(null);
    }
  };

  if (!canManageSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para gerenciar ícones.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Ícones</CardTitle>
          <CardDescription>
            Adicione ou remova ícones que serão usados em eventos e filtros.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Adicionar Novo Ícone */}
          <div className="space-y-4 pb-6 border-b border-border">
            <h3 className="font-semibold">Adicionar Novo Ícone</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Ícone (Emoji)</Label>
                <Input
                  id="icon"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  placeholder="😊"
                  maxLength={2}
                  className="text-2xl text-center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Label (Opcional)</Label>
                <Input
                  id="label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex: Feliz"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddIcon}
                  disabled={isAdding || !newIcon.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de Ícones */}
          <div className="space-y-4">
            <h3 className="font-semibold">Ícones Cadastrados</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : icons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum ícone cadastrado.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {icons.map((icon) => (
                  <Card key={icon.id} className="relative group">
                    <CardContent className="p-4 flex flex-col items-center justify-center space-y-2">
                      <div className="text-3xl">{icon.icon}</div>
                      {icon.label && (
                        <p className="text-xs text-center text-muted-foreground">
                          {icon.label}
                        </p>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setIconToDelete(icon.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!iconToDelete} onOpenChange={() => setIconToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ícone? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIcon}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
