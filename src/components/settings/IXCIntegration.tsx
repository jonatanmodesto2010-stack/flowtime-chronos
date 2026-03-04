import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Users, FileText, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export function IXCIntegration() {
  const [syncingClients, setSyncingClients] = useState(false);
  const [syncingBoletos, setSyncingBoletos] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  const fetchSyncLogs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('integration_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (err) {
      console.error('Error fetching sync logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (syncType: 'clients' | 'boletos' | 'all') => {
    const setLoading = syncType === 'clients' ? setSyncingClients : syncType === 'boletos' ? setSyncingBoletos : setSyncingAll;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ixc-sync', {
        body: { syncType },
      });

      if (error) throw error;

      if (data?.success) {
        const results = data.results;
        let message = 'Sincronização concluída! ';
        
        if (results.clients) {
          message += `Clientes: ${results.clients.totalProcessed} processados (${results.clients.totalCreated} novos, ${results.clients.totalUpdated} atualizados). `;
        }
        if (results.boletos) {
          message += `Boletos: ${results.boletos.totalProcessed} processados (${results.boletos.totalCreated} novos, ${results.boletos.totalUpdated} atualizados).`;
        }
        
        toast.success(message);
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      toast.error(`Erro na sincronização: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      fetchSyncLogs();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      case 'running':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Executando</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const isAnySyncing = syncingClients || syncingBoletos || syncingAll;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Integração IXC Provedor
          </CardTitle>
          <CardDescription>
            Sincronize clientes e boletos do sistema IXC Provedor com o sistema de cobrança.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleSync('clients')}
              disabled={isAnySyncing}
            >
              {syncingClients ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Sincronizar Clientes
            </Button>

            <Button
              onClick={() => handleSync('boletos')}
              disabled={isAnySyncing}
              variant="secondary"
            >
              {syncingBoletos ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Sincronizar Boletos
            </Button>

            <Button
              onClick={() => handleSync('all')}
              disabled={isAnySyncing}
              variant="outline"
            >
              {syncingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sincronizar Tudo
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            A sincronização de clientes importa todos os clientes do IXC. A sincronização de boletos importa as faturas (contas a receber) e associa aos clientes já importados.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sincronizações</CardTitle>
          <CardDescription>Últimas sincronizações realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : syncLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma sincronização realizada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {log.sync_type === 'clients' ? (
                        <Users className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">
                        {log.sync_type === 'clients' ? 'Clientes' : 'Boletos'}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.started_at)}
                      {log.status === 'success' && (
                        <span> — {log.records_processed} processados, {log.records_created} novos, {log.records_updated} atualizados</span>
                      )}
                      {log.error_message && (
                        <span className="text-destructive"> — {log.error_message}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
