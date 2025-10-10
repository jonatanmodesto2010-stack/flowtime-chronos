import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Tag {
  id: string;
  name: string;
  color: string;
}

export const TagsManagement = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tagColor, setTagColor] = useState('#ef4444');
  const { organizationId } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    loadTags();
  }, [organizationId]);

  const loadTags = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as tags.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateTag = (name: string): boolean => {
    if (name.toUpperCase() !== 'COBRANÇA') {
      toast({
        title: 'Erro',
        description: 'Apenas a tag "COBRANÇA" pode ser criada neste sistema.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSaveTag = async () => {
    if (!organizationId) return;

    const tagName = 'COBRANÇA';

    if (!validateTag(tagName)) return;

    try {
      if (editingTag) {
        // Atualizar cor da tag existente
        const { error } = await supabase
          .from('tags')
          .update({ color: tagColor })
          .eq('id', editingTag.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Tag atualizada com sucesso.',
        });
      } else {
        // Criar nova tag
        const { error } = await supabase
          .from('tags')
          .insert({
            organization_id: organizationId,
            name: tagName,
            color: tagColor,
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Aviso',
              description: 'A tag COBRANÇA já existe na sua organização.',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }

        toast({
          title: 'Sucesso',
          description: 'Tag criada com sucesso.',
        });
      }

      await loadTags();
      setIsDialogOpen(false);
      setEditingTag(null);
      setTagColor('#ef4444');
    } catch (error) {
      console.error('Erro ao salvar tag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a tag.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Tag excluída com sucesso.',
      });

      await loadTags();
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a tag.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    setTagColor(tag.color);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    setTagColor('#ef4444');
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Tags</CardTitle>
        <CardDescription>
          Gerencie as tags de cobrança da organização. Apenas a tag "COBRANÇA" pode ser criada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Tags Cadastradas</h3>
          {tags.length === 0 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTag ? 'Editar Tag' : 'Adicionar Tag'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome da Tag</Label>
                    <Input value="COBRANÇA" disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      Apenas a tag "COBRANÇA" pode ser criada neste sistema.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Cor da Tag</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="color"
                        type="color"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        placeholder="#ef4444"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-md">
                    <span className="text-sm text-muted-foreground">Prévia:</span>
                    <span
                      style={{ backgroundColor: tagColor }}
                      className="px-3 py-1 rounded-md text-white text-sm font-medium"
                    >
                      COBRANÇA
                    </span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTag}>
                    {editingTag ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma tag cadastrada. Clique em "Adicionar Tag" para criar a tag COBRANÇA.
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    style={{ backgroundColor: tag.color }}
                    className="px-3 py-1 rounded-md text-white text-sm font-medium"
                  >
                    {tag.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tag.color}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={isDialogOpen && editingTag?.id === tag.id} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tag)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Tag</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Nome da Tag</Label>
                          <Input value="COBRANÇA" disabled className="bg-muted" />
                          <p className="text-xs text-muted-foreground">
                            O nome da tag não pode ser alterado.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-color">Cor da Tag</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="edit-color"
                              type="color"
                              value={tagColor}
                              onChange={(e) => setTagColor(e.target.value)}
                              className="w-20 h-10 cursor-pointer"
                            />
                            <Input
                              type="text"
                              value={tagColor}
                              onChange={(e) => setTagColor(e.target.value)}
                              placeholder="#ef4444"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 border rounded-md">
                          <span className="text-sm text-muted-foreground">Prévia:</span>
                          <span
                            style={{ backgroundColor: tagColor }}
                            className="px-3 py-1 rounded-md text-white text-sm font-medium"
                          >
                            COBRANÇA
                          </span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveTag}>Salvar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a tag "{tag.name}"? Esta ação não pode ser desfeita.
                          A tag será removida de todas as timelines associadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteTag(tag.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
