import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço de sincronização com o IXC.
 * Fornece funções para sincronizar status de bloqueio e dados de clientes
 * entre o sistema IXC e o Supabase.
 */

/**
 * Sincroniza todos os clientes bloqueados do IXC com o Supabase.
 * Chama a edge function ixc-sync com sync_type='clients' e após a conclusão,
 * os registros em client_timelines terão is_active atualizado conforme o IXC.
 *
 * @param organizationId - ID da organização
 * @returns Resultado da sincronização com contagens
 */
export async function syncBlockedClientsFromIXC(organizationId: string): Promise<{
  success: boolean;
  totalProcessed?: number;
  totalUpdated?: number;
  error?: string;
}> {
  try {
    // 1. Buscar integração IXC da organização
    const { data: integration, error: intError } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'ixc')
      .eq('is_active', true)
      .single();

    if (intError || !integration) {
      return { success: false, error: 'Integração IXC não encontrada ou inativa.' };
    }

    // 2. Criar log de sincronização
    const { data: logData, error: logError } = await supabase
      .from('integration_sync_log')
      .insert({
        organization_id: organizationId,
        sync_type: 'clients',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Erro ao criar log de sincronização:', logError);
    }

    // 3. Chamar a edge function de sync
    const { data, error } = await supabase.functions.invoke('ixc-sync', {
      body: {
        organizationId,
        syncType: 'clients',
        logId: logData?.id,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      totalProcessed: data?.totalProcessed,
      totalUpdated: data?.totalUpdated,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro desconhecido na sincronização.' };
  }
}

/**
 * Sincroniza o status de um cliente específico com o IXC.
 * Busca o status atual do cliente no IXC (bloqueado/desbloqueado)
 * e atualiza o campo is_active no Supabase.
 *
 * NOTA: Esta função atualmente faz uma sync completa via edge function.
 * Para sync individual no futuro, será necessário criar um endpoint
 * dedicado na edge function que aceite um client_id específico.
 *
 * @param organizationId - ID da organização
 * @param clientId - client_id do cliente (ID no IXC)
 * @returns Resultado da sincronização
 */
export async function syncClientStatusFromIXC(
  organizationId: string,
  clientId: string
): Promise<{
  success: boolean;
  isActive?: boolean;
  error?: string;
}> {
  try {
    // Por enquanto, a edge function não suporta sync individual.
    // Fazemos a sync completa e depois consultamos o resultado.
    const syncResult = await syncBlockedClientsFromIXC(organizationId);

    if (!syncResult.success) {
      return { success: false, error: syncResult.error };
    }

    // Buscar o status atualizado do cliente
    const { data: timeline, error } = await supabase
      .from('client_timelines')
      .select('is_active')
      .eq('organization_id', organizationId)
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return { success: false, error: 'Cliente não encontrado após sincronização.' };
    }

    return {
      success: true,
      isActive: timeline.is_active,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro desconhecido.' };
  }
}

/**
 * Verifica se a organização possui integração IXC configurada e ativa.
 */
export async function hasActiveIXCIntegration(organizationId: string): Promise<boolean> {
  const { data } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'ixc')
    .eq('is_active', true)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
