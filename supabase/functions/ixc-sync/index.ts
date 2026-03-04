import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IXCClient {
  id: string;
  razao: string;
  ativo: string;
  data_cadastro?: string;
}

interface IXCFatura {
  id: string;
  id_cliente: string;
  valor: string;
  data_vencimento: string;
  status: string;
  observacao?: string;
}

function mapIxcStatus(ixcStatus: string): string {
  const statusMap: Record<string, string> = {
    'A': 'pendente',    // Aberto
    'R': 'pago',        // Recebido
    'C': 'cancelado',   // Cancelado
    'P': 'pendente',    // Pendente
  };
  return statusMap[ixcStatus] || 'pendente';
}

async function fetchIxcData(apiUrl: string, apiToken: string, endpoint: string, page: number = 1, perPage: number = 100) {
  const url = `${apiUrl}/webservice/v1/${endpoint}`;
  
  console.log(`Fetching IXC data from: ${url} (page ${page})`);
  
  const body = new URLSearchParams();
  body.append('qtype', 'id');
  body.append('query', '');
  body.append('ession_limit', perPage.toString());
  body.append('rp', perPage.toString());
  body.append('page', page.toString());
  body.append('sortname', 'id');
  body.append('sortorder', 'asc');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${apiToken}`,
      'ixcsoft': 'listar',
    },
    body: body.toString(),
  });

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`IXC API error [${response.status}]:`, responseText.substring(0, 300));
    throw new Error(`IXC API error [${response.status}]: ${responseText.substring(0, 200)}`);
  }

  if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
    if (responseText.trim().startsWith('<') || responseText.includes('<html')) {
      console.error('IXC returned HTML instead of JSON. Check API URL and token.');
      console.error('Response preview:', responseText.substring(0, 300));
      throw new Error(
        `IXC API retornou HTML em vez de JSON. Verifique se a URL da API (${apiUrl}) e o token estão corretos. ` +
        `Isso geralmente indica URL incorreta, token inválido ou o servidor IXC está inacessível.`
      );
    }
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse IXC response:', responseText.substring(0, 300));
    throw new Error(`Resposta do IXC não é JSON válido. Preview: ${responseText.substring(0, 100)}`);
  }
}

async function checkCancelled(supabaseAdmin: any, logId: string | undefined): Promise<boolean> {
  if (!logId) return false;
  const { data } = await supabaseAdmin
    .from('integration_sync_log')
    .select('status')
    .eq('id', logId)
    .single();
  return data?.status === 'cancelled';
}

async function syncClients(supabaseAdmin: any, organizationId: string, apiUrl: string, apiToken: string, logId?: string) {
  let page = 1;
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    // Check if cancelled every page
    if (await checkCancelled(supabaseAdmin, logId)) {
      console.log('Sync cancelled by user');
      return { totalProcessed, totalCreated, totalUpdated, cancelled: true };
    }

    const data = await fetchIxcData(apiUrl, apiToken, 'cliente', page, 100);
    const records = data.registros || data.rows || [];
    
    if (!Array.isArray(records) || records.length === 0) {
      hasMore = false;
      break;
    }

    for (let i = 0; i < records.length; i++) {
      const client = records[i] as IXCClient;
      
      // Check cancellation every 10 records
      if (i % 10 === 0 && i > 0 && await checkCancelled(supabaseAdmin, logId)) {
        console.log('Sync cancelled by user (inside client loop)');
        return { totalProcessed, totalCreated, totalUpdated, cancelled: true };
      }

      const clientId = client.id?.toString();
      if (!clientId) continue;

      const clientData = {
        client_id: clientId,
        client_name: client.razao || `Cliente ${clientId}`,
        is_active: client.ativo === 'S',
        organization_id: organizationId,
        start_date: client.data_cadastro || new Date().toISOString().split('T')[0],
        status: client.ativo === 'S' ? 'active' : 'inactive',
      };

      // Check if client exists
      const { data: existing } = await supabaseAdmin
        .from('client_timelines')
        .select('id')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('client_timelines')
          .update({
            client_name: clientData.client_name,
            is_active: clientData.is_active,
            status: clientData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        totalUpdated++;
      } else {
        // Need a user_id - use the first owner/admin of the org
        const { data: orgUser } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('organization_id', organizationId)
          .in('role', ['owner', 'admin'])
          .limit(1)
          .single();

        if (orgUser) {
          await supabaseAdmin
            .from('client_timelines')
            .insert({
              ...clientData,
              user_id: orgUser.user_id,
            });
          totalCreated++;
        }
      }
      totalProcessed++;
    }

    if (records.length < 100) {
      hasMore = false;
    }
    page++;
  }

  return { totalProcessed, totalCreated, totalUpdated, cancelled: false };
}

async function syncBoletos(supabaseAdmin: any, organizationId: string, apiUrl: string, apiToken: string, logId?: string) {
  let page = 1;
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    // Check if cancelled every page
    if (await checkCancelled(supabaseAdmin, logId)) {
      console.log('Sync cancelled by user');
      return { totalProcessed, totalCreated, totalUpdated, cancelled: true };
    }

    const data = await fetchIxcData(apiUrl, apiToken, 'fn_areceber', page, 100);
    const records = data.registros || data.rows || [];
    
    if (!Array.isArray(records) || records.length === 0) {
      hasMore = false;
      break;
    }

    for (let i = 0; i < records.length; i++) {
      const fatura = records[i] as IXCFatura;
      
      // Check cancellation every 10 records
      if (i % 10 === 0 && i > 0 && await checkCancelled(supabaseAdmin, logId)) {
        console.log('Sync cancelled by user (inside boleto loop)');
        return { totalProcessed, totalCreated, totalUpdated, cancelled: true };
      }

      const clientIxcId = fatura.id_cliente?.toString();
      if (!clientIxcId) continue;

      // Find the client_timeline by IXC client_id
      const { data: timeline } = await supabaseAdmin
        .from('client_timelines')
        .select('id')
        .eq('client_id', clientIxcId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!timeline) continue;

      const boletoData = {
        timeline_id: timeline.id,
        boleto_value: parseFloat(fatura.valor) || 0,
        due_date: fatura.data_vencimento,
        status: mapIxcStatus(fatura.status),
        description: fatura.observacao || `Fatura IXC #${fatura.id}`,
      };

      // Check if boleto already exists (by description containing IXC id)
      const ixcRef = `Fatura IXC #${fatura.id}`;
      const { data: existing } = await supabaseAdmin
        .from('client_boletos')
        .select('id')
        .eq('timeline_id', timeline.id)
        .eq('description', ixcRef)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('client_boletos')
          .update({
            boleto_value: boletoData.boleto_value,
            due_date: boletoData.due_date,
            status: boletoData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        totalUpdated++;
      } else {
        await supabaseAdmin
          .from('client_boletos')
          .insert(boletoData);
        totalCreated++;
      }
      totalProcessed++;
    }

    if (records.length < 100) {
      hasMore = false;
    }
    page++;
  }

  return { totalProcessed, totalCreated, totalUpdated, cancelled: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = user.id;

    // Get user's organization
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, role')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (!userRole) {
      return new Response(JSON.stringify({ error: 'User has no organization' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Only owners and admins can sync
    if (!['owner', 'admin'].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { syncType } = await req.json();
    
    if (!['clients', 'boletos', 'all', 'test'].includes(syncType)) {
      return new Response(JSON.stringify({ error: 'Invalid sync type. Use: clients, boletos, all, or test' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const organizationId = userRole.organization_id;
    const results: any = {};

    // Read IXC credentials from organization_integrations table
    const { data: integrationConfig } = await supabaseAdmin
      .from('organization_integrations')
      .select('api_url, api_token')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'ixc')
      .maybeSingle();

    // Fallback to env vars if no DB config
    const ixcApiUrl = integrationConfig?.api_url || Deno.env.get('IXC_API_URL');
    const ixcApiToken = integrationConfig?.api_token || Deno.env.get('IXC_API_TOKEN');

    if (!ixcApiUrl || !ixcApiToken) {
      return new Response(JSON.stringify({ error: 'Credenciais IXC não configuradas. Acesse Configurações → Integrações para configurar.' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Clean IXC URL
    const cleanUrl = ixcApiUrl.replace(/\/+$/, '').replace(/\/[^\/]*\.(php|html?)$/i, '').replace(/\/(app|admin|adm|webservice).*$/i, '');
    console.log(`IXC sync. Clean URL: ${cleanUrl}, Sync type: ${syncType}, Org: ${organizationId}`);

    // Auto-encode token to Base64 if it's not already base64
    let finalToken = ixcApiToken;
    try {
      // Try decoding - if it works and looks valid, it's already base64
      const decoded = atob(ixcApiToken);
      // If decoded contains ':', it's a valid base64-encoded token
      if (!decoded.includes(':')) {
        // It decoded but doesn't look like a token, re-encode with ':'
        finalToken = btoa(ixcApiToken + ':');
      }
      // else: already valid base64, use as-is
    } catch {
      // Not base64 - encode it. If it already has ':', just encode as-is
      if (ixcApiToken.includes(':')) {
        finalToken = btoa(ixcApiToken);
      } else {
        finalToken = btoa(ixcApiToken + ':');
      }
    }
    console.log(`Token format: original has colon=${ixcApiToken.includes(':')}, finalToken length=${finalToken.length}`);

    // Test connection mode - just try to fetch 1 client
    if (syncType === 'test') {
      try {
        const testData = await fetchIxcData(cleanUrl, finalToken, 'cliente', 1, 1);
        const records = testData.registros || testData.rows || [];
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Conexão estabelecida com sucesso! ${Array.isArray(records) ? records.length : 0} registro(s) retornado(s) no teste.`,
          totalRecords: testData.total || records.length || 0,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: err instanceof Error ? err.message : 'Erro desconhecido ao testar conexão',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (syncType === 'clients' || syncType === 'all') {
      // Create log entry
      const { data: logEntry } = await supabaseAdmin
        .from('integration_sync_log')
        .insert({ organization_id: organizationId, sync_type: 'clients', status: 'running' })
        .select('id')
        .single();

      try {
        const clientResult = await syncClients(supabaseAdmin, organizationId, cleanUrl, finalToken, logEntry?.id);
        results.clients = clientResult;
        
        if (logEntry && !clientResult.cancelled) {
          await supabaseAdmin
            .from('integration_sync_log')
            .update({
              status: 'success',
              records_processed: clientResult.totalProcessed,
              records_created: clientResult.totalCreated,
              records_updated: clientResult.totalUpdated,
              completed_at: new Date().toISOString(),
            })
            .eq('id', logEntry.id);
        }
      } catch (err) {
        if (logEntry) {
          await supabaseAdmin
            .from('integration_sync_log')
            .update({
              status: 'error',
              error_message: err instanceof Error ? err.message : 'Unknown error',
              completed_at: new Date().toISOString(),
            })
            .eq('id', logEntry.id);
        }
        throw err;
      }
    }

    if (syncType === 'boletos' || syncType === 'all') {
      const { data: logEntry } = await supabaseAdmin
        .from('integration_sync_log')
        .insert({ organization_id: organizationId, sync_type: 'boletos', status: 'running' })
        .select('id')
        .single();

      try {
        const boletoResult = await syncBoletos(supabaseAdmin, organizationId, cleanUrl, finalToken, logEntry?.id);
        results.boletos = boletoResult;
        
        if (logEntry && !boletoResult.cancelled) {
          await supabaseAdmin
            .from('integration_sync_log')
            .update({
              status: 'success',
              records_processed: boletoResult.totalProcessed,
              records_created: boletoResult.totalCreated,
              records_updated: boletoResult.totalUpdated,
              completed_at: new Date().toISOString(),
            })
            .eq('id', logEntry.id);
        }
      } catch (err) {
        if (logEntry) {
          await supabaseAdmin
            .from('integration_sync_log')
            .update({
              status: 'error',
              error_message: err instanceof Error ? err.message : 'Unknown error',
              completed_at: new Date().toISOString(),
            })
            .eq('id', logEntry.id);
        }
        throw err;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('IXC Sync error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
