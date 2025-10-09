import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddUserDialog } from './AddUserDialog';
import { useUserRole } from '@/hooks/useUserRole';
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

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string;
  user_role_id: string;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const { toast } = useToast();
  const { organizationId, isOwner } = useUserRole();

  const loadUsers = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          role,
          user_id,
          profiles (
            full_name
          )
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;

      const usersWithEmails: UserWithRole[] = await Promise.all(
        (data || []).map(async (userRole: any) => {
          // Buscar email do usuário atual se for ele mesmo
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          let email = '';
          
          if (currentUser?.id === userRole.user_id) {
            email = currentUser.email || '';
          } else {
            // Para outros usuários, mostrar email parcialmente oculto ou ID
            email = `user-${userRole.user_id.slice(0, 8)}`;
          }

          // profiles pode retornar null ou um objeto
          const profile = Array.isArray(userRole.profiles) 
            ? userRole.profiles[0] 
            : userRole.profiles;

          return {
            id: userRole.user_id,
            email,
            full_name: profile?.full_name || 'Usuário',
            role: userRole.role,
            user_role_id: userRole.id,
          };
        })
      );

      setUsers(usersWithEmails);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [organizationId]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userToDelete.user_role_id);

      if (error) throw error;

      toast({
        title: 'Usuário removido',
        description: 'O usuário foi removido da organização.',
      });

      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o usuário.',
        variant: 'destructive',
      });
    } finally {
      setUserToDelete(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { label: 'Proprietário', variant: 'default' as const },
      admin: { label: 'Administrador', variant: 'secondary' as const },
      member: { label: 'Membro', variant: 'outline' as const },
      viewer: { label: 'Visualizador', variant: 'outline' as const },
    };

    const config = roleConfig[role as keyof typeof roleConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>
                Adicione ou remova usuários da organização
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-right">
                      {user.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUserToDelete(user)}
                          disabled={!isOwner && user.role === 'admin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddUserDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={loadUsers}
        organizationId={organizationId}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {userToDelete?.full_name} da organização?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
