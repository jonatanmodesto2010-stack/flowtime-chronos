import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BUILD_VERSION } from '@/config/version';
import { toast } from 'sonner';

export const useVersionCheck = () => {
  const [isOutdated, setIsOutdated] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('app_versions')
          .select('build_version, version')
          .eq('is_active', true)
          .single();

        if (error || !data) {
          console.log('No active version found in database');
          return;
        }

        const serverVersion = data.build_version;
        const clientVersion = BUILD_VERSION;

        if (serverVersion !== clientVersion && clientVersion !== 'dev') {
          setIsOutdated(true);
          setLatestVersion(data.version);
          
          toast.warning('Nova versão disponível!', {
            description: `Versão ${data.version} está disponível. Recarregue a página para atualizar.`,
            action: {
              label: 'Recarregar',
              onClick: () => window.location.reload(),
            },
            duration: Infinity,
          });
        }
      } catch (err) {
        console.error('Error checking version:', err);
      }
    };

    // Check on mount
    checkVersion();

    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    // Subscribe to realtime changes
    const channel = supabase
      .channel('version_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_versions',
        },
        () => {
          checkVersion();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  return { isOutdated, latestVersion };
};
