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
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Nome não pode estar vazio').max(100),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const UserProfile = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { role } = useUserRole();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setValue('fullName', profile.full_name || '');
      }
    };

    loadProfile();
  }, [setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: data.fullName })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = () => {
    const roleLabels = {
      owner: { label: 'Proprietário', variant: 'default' as const },
      admin: { label: 'Administrador', variant: 'secondary' as const },
      member: { label: 'Membro', variant: 'outline' as const },
      viewer: { label: 'Visualizador', variant: 'outline' as const },
    };

    const roleConfig = role ? roleLabels[role] : null;
    if (!roleConfig) return null;

    return <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil</CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              {...register('fullName')}
              placeholder="Digite seu nome completo"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <div>{getRoleBadge()}</div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
