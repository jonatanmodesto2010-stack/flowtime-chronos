import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'complete' | 'reactivate'
  | 'sync' | 'login' | 'logout'
  | 'settings_change';

export type AuditEntityType =
  | 'client_timeline' | 'timeline_event' | 'timeline_line'
  | 'client_boleto' | 'tag' | 'user' | 'organization'
  | 'integration' | 'preference';

interface LogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  details?: Record<string, any>;
}

/**
 * Hook para registrar ações de auditoria no banco de dados.
 */
export function useAuditLog() {
  const { organizationId } = useUserRole();

  const log = useCallback(async ({ action, entityType, entityId, details }: LogParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) return;

      await (supabase as any)
        .from('audit_logs')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          details: details || {},
        });
    } catch (err) {
      // Audit log failure should never block the user
      console.error('[AuditLog] Failed to write:', err);
    }
  }, [organizationId]);

  return { log };
}
