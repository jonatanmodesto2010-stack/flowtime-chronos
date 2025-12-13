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
  updateDateSort: 'none' | 'desc' | 'asc';
  boletoFilter: string;
  timelineFilter: string;
  iconsFilter: string[];
  eventCountSort: 'none' | 'desc' | 'asc';
}

const DEFAULT_FILTERS: FilterValues = {
  searchTerm: '',
  statusFilter: 'all',
  tagsFilter: [],
  dateFrom: '',
  dateTo: '',
  updateDateSort: 'none',
  boletoFilter: 'all',
  timelineFilter: 'all',
  iconsFilter: [],
  eventCountSort: 'none',
};

export const useOrganizationFilters = (pageName: string) => {
  const { organizationId } = useUserRole();
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Obter userId do usuário autenticado
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  // Carregar filtros salvos
  useEffect(() => {
    if (!organizationId || !userId) {
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
          .eq('user_id', userId)
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
  }, [organizationId, pageName, userId]);

  // Atualizar filtros localmente (imediato)
  const setLocalFilters = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  // Atualizar filtros (salvar no banco com debounce)
  const updateFilters = useCallback(
    (newFilters: FilterValues) => {
      if (!organizationId || !userId) return;

      // Atualizar estado local imediatamente para UI responsiva
      setFilters(newFilters);

      // Limpar timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Se o searchTerm foi limpo, salvar imediatamente (sem debounce)
      const isSearchCleared = newFilters.searchTerm === '' && filters.searchTerm !== '';
      const delay = isSearchCleared ? 0 : 500; // 500ms para outras mudanças, 0ms para limpar busca

      // Criar novo timer para salvar no banco
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
                user_id: userId,
                filter_data: newFilters as any,
                updated_by: userId,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'organization_id,page_name,user_id',
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
      }, delay);
    },
    [organizationId, pageName, userId, filters.searchTerm]
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
