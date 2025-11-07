import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const addUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Senha deve conter letras maiúsculas, minúsculas e números'),
  fullName: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  role: z.enum(['admin', 'member', 'viewer']),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string | null;
}

export const AddUserDialog = ({ isOpen, onClose, onSuccess, organizationId }: AddUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      role: 'member',
    },
  });

  const selectedRole = watch('role');

  // Função auxiliar para aguardar profile ser criado com retry e backoff exponencial
  const waitForProfile = async (userId: string, maxAttempts = 10) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const delay = Math.min(500 * Math.pow(2, attempt), 5000); // Max 5s por tentativa
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && !error.message.includes('not found')) {
        throw error; // Erro real, não retry
      }
      
      if (profile) {
        return profile; // Sucesso!
      }
      
      console.log(`Aguardando profile ser criado (tentativa ${attempt + 1}/${maxAttempts})...`);
    }
    
    throw new Error('Timeout: Profile não foi criado após múltiplas tentativas. Por favor, tente novamente.');
  };

  const onSubmit = async (data: AddUserFormData) => {
    console.log('[AddUserDialog] 🚀 Iniciando criação de usuário');
    console.log('[AddUserDialog] 📧 Email:', data.email);
    console.log('[AddUserDialog] 👤 Nome:', data.fullName);
    console.log('[AddUserDialog] 🎭 Role:', data.role);
    console.log('[AddUserDialog] 🏢 Organization ID:', organizationId);
    
    if (!organizationId) {
      console.log('[AddUserDialog] ❌ Organization ID não encontrado');
      toast({
        title: 'Erro',
        description: 'Organização não encontrada.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('[AddUserDialog] 📝 Chamando supabase.auth.signUp...');
      
      // Criar usuário com metadados indicando que foi criado por admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            created_by_admin: true,
            organization_id: organizationId,
            role: data.role,
          },
          emailRedirectTo: undefined,
        },
      });

      console.log('[AddUserDialog] 📊 Resposta do signUp:', { authData, authError });

      if (authError) {
        console.log('[AddUserDialog] ❌ Erro no signUp:', authError);
        // Tratar erro de email já cadastrado
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          throw new Error('Este email já está cadastrado. Use outro email.');
        }
        throw authError;
      }
      
      if (!authData.user) {
        console.log('[AddUserDialog] ❌ authData.user é null/undefined');
        throw new Error('Falha ao criar usuário');
      }

      console.log('[AddUserDialog] ✅ Usuário criado no auth:', authData.user.id);
      console.log('[AddUserDialog] 🔍 Identidades:', authData.user.identities);

      // Se o usuário já existia (repeated signup), não continuar
      if (authData.user.identities && authData.user.identities.length === 0) {
        console.log('[AddUserDialog] ❌ Usuário já existe (identities vazio)');
        throw new Error('Este email já está cadastrado. Use outro email.');
      }

      console.log('[AddUserDialog] ⏳ Aguardando profile ser criado pelo trigger...');

      // Aguardar profile e role serem criados pelo trigger
      await waitForProfile(authData.user.id);

      console.log('[AddUserDialog] ✅ Profile criado com sucesso!');

      toast({
        title: 'Usuário criado',
        description: 'O novo usuário foi adicionado à organização.',
      });

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('[AddUserDialog] ❌ ERRO FINAL:', error);
      console.error('[AddUserDialog] ❌ Mensagem:', error.message);
      console.error('[AddUserDialog] ❌ Stack:', error.stack);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
    } finally {
      console.log('[AddUserDialog] 🏁 Finalizando (isLoading = false)');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie uma nova conta de usuário para a organização
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="usuario@exemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha Inicial</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Mínimo 8 caracteres"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">A senha deve conter:</p>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                <li>Mínimo 8 caracteres</li>
                <li>Pelo menos uma letra maiúscula (A-Z)</li>
                <li>Pelo menos uma letra minúscula (a-z)</li>
                <li>Pelo menos um número (0-9)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              {...register('fullName')}
              placeholder="Nome completo do usuário"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={selectedRole} onValueChange={(value) => setValue('role', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
