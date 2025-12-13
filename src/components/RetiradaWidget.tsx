import { useState, useEffect } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabaseClient } from '@/lib/supabase-client';
import { useUserRole } from '@/hooks/useUserRole';

interface RetiradaClient {
  id: string;
  client_name: string;
  client_id?: string | null;
  start_date: string;
  status: string;
}

interface RetiradaWidgetProps {
  onClientSelect?: (client: RetiradaClient) => void;
}

// Tags que indicam retirada
const RETIRADA_TAG_NAMES = [
  'ENVIAR MENSAGEM DE RETIRADA',
  'CANCELAMENTO INADIMPLENCIA / RETIRADA DE EQUIPAMEN',
  'EQUIPAMENTO RETIRADO SALDO EM DIA',
  'EQUIPAMENTO RETIRADO SALDO DEVEDOR',
  'RETIRADA',
  'RETIRADA DE EQUIPAMENTO'
];

export const RetiradaWidget = ({ onClientSelect }: RetiradaWidgetProps) => {
  const [clients, setClients] = useState<RetiradaClient[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useUserRole();

  useEffect(() => {
    if (organizationId) {
      loadRetiradasClients();
    }
  }, [organizationId]);

  const loadRetiradasClients = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);

      // 1. Buscar tags de retirada da organização
      const { data: tags } = await supabaseClient
        .from('tags')
        .select('id, name')
        .eq('organization_id', organizationId);

      // Filtrar tags que contêm palavras-chave de retirada
      const retiradaTags = (tags || []).filter(tag => 
        RETIRADA_TAG_NAMES.some(name => 
          tag.name.toUpperCase().includes(name.toUpperCase()) ||
          name.toUpperCase().includes(tag.name.toUpperCase())
        ) ||
        tag.name.toUpperCase().includes('RETIRADA')
      );

      if (retiradaTags.length === 0) {
        setClients([]);
        return;
      }

      const tagIds = retiradaTags.map(t => t.id);

      // 2. Buscar clientes com essas tags
      const { data: clientTags } = await supabaseClient
        .from('client_timeline_tags')
        .select('timeline_id')
        .in('tag_id', tagIds);

      if (!clientTags || clientTags.length === 0) {
        setClients([]);
        return;
      }

      const timelineIds = [...new Set(clientTags.map(ct => ct.timeline_id))];

      // 3. Buscar dados dos clientes
      const { data: clientsData } = await supabaseClient
        .from('client_timelines')
        .select('id, client_name, client_id, start_date, status')
        .in('id', timelineIds)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      setClients(clientsData || []);
    } catch (error) {
      console.error('Erro ao carregar clientes de retirada:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border flex-1">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package size={14} className="text-orange-500" />
          Retiradas
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {clients.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum cliente de retirada
          </p>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-1.5">
              {clients.map(client => (
                <div
                  key={client.id}
                  className="p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onClientSelect?.(client as any)}
                >
                  <p className="text-sm font-medium truncate">{client.client_name}</p>
                  {client.client_id && (
                    <p className="text-xs text-muted-foreground">#{client.client_id}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
