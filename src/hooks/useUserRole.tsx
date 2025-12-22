import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'owner' | 'admin' | 'member' | 'viewer';

interface UserRoleData {
  role: AppRole | null;
  organizationId: string | null;
  isLoading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
}

// ID da organização padrão para acesso sem autenticação
const DEFAULT_ORGANIZATION_ID = 'beee5967-a672-409f-a97f-cb5d4fd04b57';

export const useUserRole = (): UserRoleData => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Sem autenticação: usar organização padrão com role de viewer
          setRole('viewer');
          setOrganizationId(DEFAULT_ORGANIZATION_ID);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setRole(data.role as AppRole);
          setOrganizationId(data.organization_id);
        } else {
          // Usuário autenticado mas sem role: usar org padrão
          setRole('viewer');
          setOrganizationId(DEFAULT_ORGANIZATION_ID);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Em caso de erro: usar org padrão
        setRole('viewer');
        setOrganizationId(DEFAULT_ORGANIZATION_ID);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const canManageUsers = isOwner || isAdmin;
  const canManageSettings = isOwner || isAdmin;

  return {
    role,
    organizationId,
    isLoading,
    isOwner,
    isAdmin,
    canManageUsers,
    canManageSettings,
  };
};
