import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

const generalSettingsSchema = z.object({
  organizationName: z.string().trim().min(1, 'Nome não pode estar vazio').max(100),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

export const GeneralSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { organizationId } = useUserRole();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Error loading organization:', error);
        return;
      }

      setValue('organizationName', data.name);
    };

    loadSettings();
  }, [organizationId, setValue]);

  const onSubmit = async (data: GeneralSettingsFormData) => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: data.organizationName })
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações Gerais</CardTitle>
        <CardDescription>
          Gerencie as configurações da organização
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Nome da Organização</Label>
            <Input
              id="organizationName"
              {...register('organizationName')}
              placeholder="Digite o nome da organização"
            />
            {errors.organizationName && (
              <p className="text-sm text-destructive">{errors.organizationName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Limite de Eventos por Linha</Label>
            <div className="flex items-center gap-2">
              <Input value="28" disabled className="bg-muted max-w-[100px]" />
              <p className="text-sm text-muted-foreground">
                (Fixo em 28 eventos)
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
