import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface OrganizationIcon {
  id: string;
  icon: string;
  label: string | null;
}

export const useOrganizationIcons = () => {
  const { organizationId } = useUserRole();
  const [icons, setIcons] = useState<OrganizationIcon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIcons = async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('organization_icons')
      .select('id, icon, label')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching icons:', error);
      setIsLoading(false);
      return;
    }

    setIcons(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchIcons();

    if (!organizationId) return;

    // Realtime subscription
    const channel = supabase
      .channel('organization_icons_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_icons',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchIcons();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return { icons, isLoading, refetch: fetchIcons };
};
