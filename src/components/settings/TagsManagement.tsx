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
  const [tagName, setTagName] = useState('');
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

  const handleSaveTag = async () => {
    if (!organizationId) return;

    const trimmedName = tagName.trim();

    if (!trimmedName) {
      toast({
        title: 'Erro',
        description: 'O nome da tag não pode estar vazio.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName.length > 150) {
      toast({
        title: 'Erro',
        description: 'O nome da tag deve ter no máximo 150 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTag) {
        // Verificar se já existe outra tag com o mesmo nome
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', trimmedName)
          .eq('organization_id', organizationId)
          .neq('id', editingTag.id)
          .maybeSingle();

        if (existingTag) {
          toast({
            title: 'Erro',
            description: 'Já existe uma tag com este nome.',
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('tags')
          .update({ name: trimmedName, color: tagColor })
          .eq('id', editingTag.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Tag atualizada com sucesso.',
        });
      } else {
        // Verificar se já existe uma tag com o mesmo nome
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', trimmedName)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (existingTag) {
          toast({
            title: 'Erro',
            description: 'Já existe uma tag com este nome.',
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('tags')
          .insert({
            organization_id: organizationId,
            name: trimmedName,
            color: tagColor,
          });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Tag criada com sucesso.',
        });
      }

      await loadTags();
      setIsDialogOpen(false);
      setEditingTag(null);
      setTagName('');
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
    setTagName(tag.name);
    setTagColor(tag.color);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    setTagName('');
    setTagColor('#ef4444');
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Gerenciamento de Tags</CardTitle>
          <CardDescription>
            Crie e gerencie as tags da organização.
          </CardDescription>
        </div>
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
                <Input 
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Digite o nome da tag"
                  maxLength={150}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 150 caracteres
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Cor da Tag</Label>
                <div className="flex gap-2 items-center mb-2">
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
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Cores sugeridas:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: '#ef4444' }}
                      onClick={() => setTagColor('#ef4444')}
                      title="Vermelho"
                    />
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: '#f59e0b' }}
                      onClick={() => setTagColor('#f59e0b')}
                      title="Laranja"
                    />
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: '#10b981' }}
                      onClick={() => setTagColor('#10b981')}
                      title="Verde"
                    />
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: '#3b82f6' }}
                      onClick={() => setTagColor('#3b82f6')}
                      title="Azul"
                    />
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: '#8b5cf6' }}
                      onClick={() => setTagColor('#8b5cf6')}
                      title="Roxo"
                    />
                    <button
                      type="button"
                      className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: '#ec4899' }}
                      onClick={() => setTagColor('#ec4899')}
                      title="Rosa"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <span className="text-sm text-muted-foreground">Prévia:</span>
                <span
                  style={{ backgroundColor: tagColor }}
                  className="px-3 py-1 rounded-md text-white text-sm font-medium"
                >
                  {tagName || 'Nome da tag'}
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
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma tag cadastrada. Clique em "Adicionar Tag" para criar sua primeira tag.
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
                          <Input 
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            placeholder="Digite o nome da tag"
                            maxLength={150}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-color">Cor da Tag</Label>
                          <div className="flex gap-2 items-center mb-2">
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
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Cores sugeridas:</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: '#ef4444' }}
                                onClick={() => setTagColor('#ef4444')}
                              />
                              <button
                                type="button"
                                className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: '#f59e0b' }}
                                onClick={() => setTagColor('#f59e0b')}
                              />
                              <button
                                type="button"
                                className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: '#10b981' }}
                                onClick={() => setTagColor('#10b981')}
                              />
                              <button
                                type="button"
                                className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: '#3b82f6' }}
                                onClick={() => setTagColor('#3b82f6')}
                              />
                              <button
                                type="button"
                                className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: '#8b5cf6' }}
                                onClick={() => setTagColor('#8b5cf6')}
                              />
                              <button
                                type="button"
                                className="w-8 h-8 rounded-md border-2 border-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: '#ec4899' }}
                                onClick={() => setTagColor('#ec4899')}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 border rounded-md">
                          <span className="text-sm text-muted-foreground">Prévia:</span>
                          <span
                            style={{ backgroundColor: tagColor }}
                            className="px-3 py-1 rounded-md text-white text-sm font-medium"
                          >
                            {tagName || 'Nome da tag'}
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
