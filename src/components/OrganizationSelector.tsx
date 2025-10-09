import { useState, useEffect } from 'react';
import { Building2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { organizationSchema } from '@/lib/validations';

export const OrganizationSelector = () => {
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const { organizationId, isLoading: isRoleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentOrgName, setCurrentOrgName] = useState<string | null>(null);

  // Buscar nome da organização atual
  useEffect(() => {
    if (organizationId) {
      supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single()
        .then(({ data }) => {
          if (data) setCurrentOrgName(data.name);
        });
    }
  }, [organizationId]);

  const handleCreateOrganization = async () => {
    try {
      // Validar nome
      const validation = organizationSchema.safeParse({ name: organizationName });
      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.issues[0].message,
          variant: 'destructive',
        });
        return;
      }

      setIsCreating(true);

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Criar organização
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: organizationName.trim() })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Criar role de owner para o super admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'owner',
        });

      if (roleError) throw roleError;

      // 3. Atualizar organization_id no perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: newOrg.id })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({
        title: 'Organização criada!',
        description: `${newOrg.name} foi criada com sucesso.`,
      });

      // Recarregar página para atualizar contexto
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Erro ao criar organização',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isSuperAdminLoading || isRoleLoading) {
    return null;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <motion.button
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Organizações"
          >
            <Building2 size={18} />
            <span className="text-sm font-medium hidden sm:inline">
              {currentOrgName || 'Selecionar Organização'}
            </span>
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-card border-border">
          {currentOrgName && (
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
              {currentOrgName}
            </div>
          )}
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setIsDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus size={16} className="mr-2" />
            Nova Organização
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Organização</DialogTitle>
            <DialogDescription>
              Digite o nome da nova organização. Isso substituirá sua organização atual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Organização</Label>
              <Input
                id="name"
                placeholder="Ex: Minha Empresa"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={isCreating || !organizationName.trim()}
            >
              {isCreating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
