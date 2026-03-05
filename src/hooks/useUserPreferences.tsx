import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para gerenciar preferências do usuário no banco de dados.
 * Faz fallback para localStorage quando o usuário não está autenticado.
 */
export function useUserPreferences() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getPreference = useCallback(async (key: string, fallback: string): Promise<string> => {
    if (!userId) {
      return localStorage.getItem(key) || fallback;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', userId)
        .eq('preference_key', key)
        .maybeSingle();

      if (error) throw error;

      if (data?.preference_value) {
        // Sync to localStorage as cache
        localStorage.setItem(key, data.preference_value);
        return data.preference_value;
      }

      // Fallback: check localStorage then default
      const local = localStorage.getItem(key);
      if (local) {
        // Migrate localStorage value to DB
        await setPreference(key, local);
        return local;
      }

      return fallback;
    } catch {
      return localStorage.getItem(key) || fallback;
    }
  }, [userId]);

  const setPreference = useCallback(async (key: string, value: string) => {
    // Always update localStorage for instant access
    localStorage.setItem(key, value);

    if (!userId) return;

    try {
      await (supabase as any)
        .from('user_preferences')
        .upsert(
          {
            user_id: userId,
            preference_key: key,
            preference_value: value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,preference_key' }
        );
    } catch (err) {
      console.error('Failed to save preference to DB:', err);
    }
  }, [userId]);

  return { getPreference, setPreference, loading, isAuthenticated: !!userId };
}
