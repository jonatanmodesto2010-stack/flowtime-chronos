import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle, CheckCircle, Clock, DollarSign, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { fetchAllPaginated } from '@/lib/supabase-helpers';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardMetrics {
  totalClients: number;
  activeClients: number;
  blockedClients: number;
  completedTimelines: number;
  totalOverdueValue: number;
  overdueCount: number;
  recentActivity: { action: string; entity_type: string; details: any; created_at: string }[];
}

const Dashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useUserRole();

  useEffect(() => {
    if (!organizationId) return;
    loadMetrics();
  }, [organizationId]);

  const loadMetrics = async () => {
    if (!organizationId) return;
    try {
      // Fetch all timelines
      const timelines = await fetchAllPaginated(
        'client_timelines',
        'id, client_id, client_name, is_active, status',
        [{ column: 'organization_id', value: organizationId }]
      );

      // Unique clients by client_id
      const clientMap = new Map<string, any>();
      timelines.forEach((t: any) => {
        const key = t.client_id || t.id;
        if (!clientMap.has(key)) clientMap.set(key, t);
      });

      const totalClients = clientMap.size;
      const activeClients = Array.from(clientMap.values()).filter((c: any) => c.is_active && c.status === 'active').length;
      const blockedClients = Array.from(clientMap.values()).filter((c: any) => !c.is_active).length;
      const completedTimelines = timelines.filter((t: any) => t.status === 'completed').length;

      // Fetch overdue boletos
      const timelineIds = timelines.map((t: any) => t.id);
      let totalOverdueValue = 0;
      let overdueCount = 0;

      if (timelineIds.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        // Fetch in batches
        const chunkSize = 200;
        for (let i = 0; i < timelineIds.length; i += chunkSize) {
          const chunk = timelineIds.slice(i, i + chunkSize);
          const { data: boletos } = await (supabase as any)
            .from('client_boletos')
            .select('boleto_value, due_date, status')
            .in('timeline_id', chunk)
            .lt('due_date', today)
            .neq('status', 'Pago');

          if (boletos) {
            boletos.forEach((b: any) => {
              if (b.status !== 'Cancelado') {
                overdueCount++;
                totalOverdueValue += Number(b.boleto_value) || 0;
              }
            });
          }
        }
      }

      // Fetch recent audit logs
      let recentActivity: any[] = [];
      try {
        const { data } = await (supabase as any)
          .from('audit_logs')
          .select('action, entity_type, details, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10);
        recentActivity = data || [];
      } catch {
        // audit_logs may not have data yet
      }

      setMetrics({
        totalClients,
        activeClients,
        blockedClients,
        completedTimelines,
        totalOverdueValue,
        overdueCount,
        recentActivity,
      });
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const actionLabels: Record<string, string> = {
    create: 'Criou',
    update: 'Atualizou',
    delete: 'Excluiu',
    complete: 'Finalizou',
    sync: 'Sincronizou',
    settings_change: 'Alterou configuração',
  };

  const entityLabels: Record<string, string> = {
    client_timeline: 'cliente',
    timeline_event: 'evento',
    timeline_line: 'linha',
    client_boleto: 'boleto',
    tag: 'tag',
    user: 'usuário',
    organization: 'organização',
    integration: 'integração',
    preference: 'preferência',
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Visão geral da organização</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-5 rounded" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : metrics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total de Clientes</CardTitle>
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{metrics.totalClients}</div>
                      <p className="text-xs text-muted-foreground">clientes únicos</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{metrics.activeClients}</div>
                      <p className="text-xs text-muted-foreground">em cobrança ativa</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Bloqueados</CardTitle>
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-destructive">{metrics.blockedClients}</div>
                      <p className="text-xs text-muted-foreground">clientes bloqueados</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Finalizados</CardTitle>
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{metrics.completedTimelines}</div>
                      <p className="text-xs text-muted-foreground">cobranças finalizadas</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Valor em Atraso</CardTitle>
                      <DollarSign className="h-5 w-5 text-destructive" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{formatCurrency(metrics.totalOverdueValue)}</div>
                      <p className="text-xs text-muted-foreground">{metrics.overdueCount} boletos vencidos</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Bloqueio</CardTitle>
                      <Activity className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {metrics.totalClients > 0 ? Math.round((metrics.blockedClients / metrics.totalClients) * 100) : 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">dos clientes bloqueados</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                {metrics.recentActivity.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {metrics.recentActivity.map((activity, i) => (
                          <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                            <span className="text-foreground">
                              {actionLabels[activity.action] || activity.action}{' '}
                              {entityLabels[activity.entity_type] || activity.entity_type}
                              {activity.details?.client_name ? `: ${activity.details.client_name}` : ''}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {new Date(activity.created_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
