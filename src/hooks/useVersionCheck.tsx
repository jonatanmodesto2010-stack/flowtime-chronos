import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BUILD_VERSION } from '@/config/version';
import { toast } from 'sonner';

export const useVersionCheck = () => {
  const [isOutdated, setIsOutdated] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    // Função para verificar versão
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

        console.log('Version check:', { serverVersion, clientVersion });

        if (serverVersion !== clientVersion && clientVersion !== 'dev') {
          setIsOutdated(true);
          setLatestVersion(data.version);
          
          // Mostrar toast com opção de reload
          toast.warning('Nova versão disponível!', {
            description: `Versão ${data.version} está disponível. Recarregue a página para atualizar.`,
            action: {
              label: 'Recarregar',
              onClick: () => window.location.reload(),
            },
            duration: Infinity, // Toast permanece até ser fechado
          });
        }
      } catch (error) {
        console.error('Error checking version:', error);
      }
    };

    // Verificar ao carregar
    checkVersion();

    // Verificar a cada 5 minutos
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    // Inscrever-se em mudanças realtime
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
          console.log('New version detected via realtime');
          checkVersion();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return { isOutdated, latestVersion };
};
