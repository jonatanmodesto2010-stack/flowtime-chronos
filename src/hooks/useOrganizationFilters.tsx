import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useUserRole } from './useUserRole';

export interface FilterValues {
  searchTerm: string;
  statusFilter: string;
  tagsFilter: string[];
  dateFrom: string;
  dateTo: string;
  updateDateFrom: string;
  updateDateTo: string;
  boletoFilter: string;
  timelineFilter: string;
}

const DEFAULT_FILTERS: FilterValues = {
  searchTerm: '',
  statusFilter: 'all',
  tagsFilter: [],
  dateFrom: '',
  dateTo: '',
  updateDateFrom: '',
  updateDateTo: '',
  boletoFilter: 'all',
  timelineFilter: 'all',
};

export const useOrganizationFilters = (pageName: string) => {
  const { organizationId } = useUserRole();
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar filtros salvos
  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    const loadFilters = async () => {
      try {
        const { data, error } = await supabase
          .from('organization_filters')
          .select('filter_data')
          .eq('organization_id', organizationId)
          .eq('page_name', pageName)
          .maybeSingle();

        if (error) throw error;

        if (data?.filter_data && typeof data.filter_data === 'object' && data.filter_data !== null) {
          setFilters({ ...DEFAULT_FILTERS, ...(data.filter_data as any) });
        }
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilters();
  }, [organizationId, pageName]);

  // Configurar Realtime
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`org-filters-${organizationId}-${pageName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_filters',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as any;
            if (newData.page_name === pageName && newData.filter_data) {
              setFilters({ ...DEFAULT_FILTERS, ...(newData.filter_data as any) });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, pageName]);

  // Atualizar filtros localmente (imediato)
  const setLocalFilters = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  // Atualizar filtros (salvar no banco com debounce)
  const updateFilters = useCallback(
    (newFilters: FilterValues) => {
      if (!organizationId) return;

      // Atualizar estado local imediatamente para UI responsiva
      setFilters(newFilters);

      // Limpar timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Criar novo timer para salvar no banco após 500ms
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const { data: currentUser } = await supabase.auth.getUser();
          
          // Retry logic para lidar com race conditions
          let retries = 3;
          while (retries > 0) {
            const { error } = await supabase
              .from('organization_filters')
              .upsert({
                organization_id: organizationId,
                page_name: pageName,
                filter_data: newFilters as any,
                updated_by: currentUser.user?.id || null,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'organization_id,page_name',
                ignoreDuplicates: false
              });

            if (!error) {
              break;
            }

            // Se for erro de duplicate key, tentar novamente
            if (error.code === '23505' && retries > 1) {
              retries--;
              await new Promise(r => setTimeout(r, 100));
              continue;
            }

            throw error;
          }
        } catch (error) {
          console.error('Erro ao atualizar filtros:', error);
        }
      }, 500);
    },
    [organizationId, pageName]
  );

  // Cleanup do debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    filters,
    updateFilters,
    setLocalFilters,
    isLoading,
  };
};
