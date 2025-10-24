import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  timelineId: string;
  organizationId: string;
  selectedTags: Tag[];
  onTagsChange: () => void;
}

export const TagSelector = ({ timelineId, organizationId, selectedTags, onTagsChange }: TagSelectorProps) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadAllTags();
    }
  }, [isOpen, organizationId]);

  const loadAllTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, color')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      console.error('Erro ao carregar tags:', error);
      return;
    }

    setAllTags(data || []);
  };

  const handleToggleTag = async (tagId: string, isChecked: boolean) => {
    if (isChecked) {
      const { error } = await supabase
        .from('client_timeline_tags')
        .insert({ timeline_id: timelineId, tag_id: tagId });

      if (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível adicionar a tag.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('client_timeline_tags')
        .delete()
        .eq('timeline_id', timelineId)
        .eq('tag_id', tagId);

      if (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível remover a tag.',
          variant: 'destructive',
        });
        return;
      }
    }

    onTagsChange();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex gap-2 cursor-pointer">
          {selectedTags.length === 0 ? (
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              + Tags
            </Badge>
          ) : (
            selectedTags.map(tag => (
              <Badge
                key={tag.id}
                style={{ backgroundColor: tag.color }}
                className="text-white hover:opacity-80 px-3 py-1 cursor-pointer"
              >
                {tag.name}
              </Badge>
            ))
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-popover z-[60]" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm mb-3">Selecionar Tags</h4>
          {allTags.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma tag disponível. Crie tags em Configurações.
            </p>
          ) : (
            allTags.map(tag => {
              const isSelected = selectedTags.some(t => t.id === tag.id);
              return (
                <div key={tag.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggleTag(tag.id, checked as boolean)}
                  />
                  <Badge
                    style={{ backgroundColor: tag.color }}
                    className="text-white flex-1 justify-center"
                  >
                    {tag.name}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
