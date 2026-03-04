import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { RefreshCw, Users, FileText, CheckCircle, XCircle, Clock, Loader2, Save, Eye, EyeOff, Settings2, Plug, Wifi } from 'lucide-react';

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
  const { organizationId } = useUserRole();
  const [syncingClients, setSyncingClients] = useState(false);
  const [syncingBoletos, setSyncingBoletos] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Config state
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    fetchSyncLogs();
    if (organizationId) {
      fetchConfig();
    }
  }, [organizationId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('organization_integrations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'ixc')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setApiUrl(data.api_url || '');
        setApiToken(data.api_token || '');
        setHasConfig(true);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setConfigLoaded(true);
    }
  };

  const handleSaveConfig = async () => {
    if (!organizationId) return;
    if (!apiUrl.trim()) {
      toast.error('Informe a URL da API do IXC');
      return;
    }
    if (!apiToken.trim()) {
      toast.error('Informe o Token da API do IXC');
      return;
    }

    setSavingConfig(true);
    try {
      const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
      
      if (hasConfig) {
        const { error } = await (supabase as any)
          .from('organization_integrations')
          .update({
            api_url: cleanUrl,
            api_token: apiToken.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
          .eq('integration_type', 'ixc');

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('organization_integrations')
          .insert({
            organization_id: organizationId,
            integration_type: 'ixc',
            api_url: cleanUrl,
            api_token: apiToken.trim(),
          });

        if (error) throw error;
        setHasConfig(true);
      }

      toast.success('Configuração do IXC salva com sucesso!');
    } catch (err: any) {
      console.error('Error saving config:', err);
      toast.error(`Erro ao salvar configuração: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    if (!hasConfig) {
      toast.error('Salve a configuração antes de testar.');
      return;
    }
    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-sync', {
        body: { syncType: 'test' },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Conexão com IXC estabelecida com sucesso!');
      } else {
        toast.error(`Falha na conexão: ${data?.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      console.error('Test connection error:', err);
      toast.error(`Erro ao testar conexão: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setTestingConnection(false);
    }
  };

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
    if (!hasConfig) {
      toast.error('Configure a URL e o Token do IXC antes de sincronizar.');
      return;
    }

    const setLoadingState = syncType === 'clients' ? setSyncingClients : syncType === 'boletos' ? setSyncingBoletos : setSyncingAll;
    setLoadingState(true);

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
      setLoadingState(false);
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
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configuração IXC
          </CardTitle>
          <CardDescription>
            Informe a URL e o Token de acesso da API do IXC Provedor. O token pode ser encontrado no IXC em Usuários → seu perfil → seção API → Token de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ixc-url">URL da API do IXC</Label>
            <Input
              id="ixc-url"
              placeholder="https://ixc.suaempresa.com.br"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Apenas o domínio base, sem /adm.php ou /webservice. Ex: https://ixc.glorianet.com.br
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ixc-token">Token de Acesso da API</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ixc-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="Cole o token de acesso da API aqui"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre em: IXC → Usuários → Seu perfil → Seção API → Token de acesso
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configuração
            </Button>

            <Button 
              onClick={handleTestConnection} 
              disabled={testingConnection || !hasConfig}
              variant="outline"
            >
              {testingConnection ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sincronização
          </CardTitle>
          <CardDescription>
            Sincronize clientes e boletos do sistema IXC Provedor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleSync('clients')}
              disabled={isAnySyncing || !hasConfig}
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
              disabled={isAnySyncing || !hasConfig}
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
              disabled={isAnySyncing || !hasConfig}
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

          {!hasConfig && configLoaded && (
            <p className="text-sm text-amber-600">
              ⚠️ Configure a URL e o Token acima antes de sincronizar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sync Logs */}
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
