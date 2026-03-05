import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface IXCClient {
  id: string;
  razao: string;
  ativo: string;
  bloqueado: string;
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

async function fetchIxcData(apiUrl: string, apiToken: string, endpoint: string, page: number = 1, perPage: number = 100, queryOverrides?: { qtype?: string; query?: string; oper?: string }) {
  const url = `${apiUrl}/webservice/v1/${endpoint}`;
  
  console.log(`Fetching IXC data from: ${url} (page ${page})`);
  
  // Default: oper ">" with query "0" to fetch ALL records (id > 0)
  const qtype = queryOverrides?.qtype || `${endpoint}.id`;
  const query = queryOverrides?.query ?? '0';
  const oper = queryOverrides?.oper || '>';
  
  const body = new URLSearchParams();
  body.append('qtype', qtype);
  body.append('query', query);
  body.append('oper', oper);
  body.append('page', page.toString());
  body.append('rp', perPage.toString());
  body.append('sortname', `${endpoint}.id`);
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

async function fetchBlockedClientIds(apiUrl: string, apiToken: string, contractsApiUrl?: string | null): Promise<Set<string>> {
  const blockedIds = new Set<string>();

  // 1. Try cliente_bloqueado endpoint first (direct blocked list)
  let page = 1;
  let hasMore = true;
  let bloqueadoWorked = false;

  while (hasMore) {
    try {
      const data = await fetchIxcData(apiUrl, apiToken, 'cliente_bloqueado', page, 500);
      const records = data.registros || data.rows || [];

      if (page === 1) {
        console.log(`cliente_bloqueado total: ${data.total || 0}`);
        if (Array.isArray(records) && records.length > 0) {
          bloqueadoWorked = true;
          const fields = Object.keys(records[0]);
          const relevantFields = fields.filter(f => 
            f.includes('cliente') || f.includes('id_') || f.includes('bloq') || f.includes('status')
          );
          console.log(`cliente_bloqueado fields:`, JSON.stringify(relevantFields));
          console.log(`cliente_bloqueado sample:`, JSON.stringify(records[0]));
        }
      }

      if (!Array.isArray(records) || records.length === 0) break;

      for (const record of records) {
        const clientId = (record.id_cliente || record.cliente_id || record.id)?.toString();
        if (clientId) {
          blockedIds.add(clientId);
        }
      }

      if (records.length < 500) break;
      page++;
    } catch (err) {
      console.error('Error fetching cliente_bloqueado:', err);
      break;
    }
  }

  if (bloqueadoWorked) {
    console.log(`Found ${blockedIds.size} blocked clients via cliente_bloqueado`);
  }

  // 2. Also check cliente_contrato for active contracts with non-active internet
  const contractsUrl = contractsApiUrl || apiUrl;
  page = 1;
  hasMore = true;
  const allStatusValues = new Set<string>();
  let contractBlocked = 0;

  while (hasMore) {
    try {
      const data = await fetchIxcData(contractsUrl, apiToken, 'cliente_contrato', page, 500);
      const records = data.registros || data.rows || [];

      if (page === 1) {
        console.log(`cliente_contrato total: ${data.total || 0}`);
      }

      if (!Array.isArray(records) || records.length === 0) break;

      for (const record of records) {
        const statusInternet = record.status_internet?.toString() || '';
        const status = record.status?.toString() || '';
        allStatusValues.add(statusInternet);
        
        if (status === 'A' && statusInternet !== 'A') {
          const clientId = record.id_cliente?.toString();
          if (clientId && !blockedIds.has(clientId)) {
            blockedIds.add(clientId);
            contractBlocked++;
          }
        }
      }

      if (records.length < 500) break;
      page++;
    } catch (err) {
      console.error('Error fetching cliente_contrato:', err);
      break;
    }
  }

  console.log(`All unique status_internet values: ${JSON.stringify([...allStatusValues])}`);
  console.log(`Additional blocked from cliente_contrato: ${contractBlocked}`);
  console.log(`Total unique blocked client IDs: ${blockedIds.size}`);
  return blockedIds;
}

async function syncClients(supabaseAdmin: any, organizationId: string, apiUrl: string, apiToken: string, logId?: string, contractsApiUrl?: string | null) {
  let page = 1;
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let hasMore = true;

  // Get a user_id for new inserts (fetch once, not per record)
  const { data: orgUser } = await supabaseAdmin
    .from('user_roles')
    .select('user_id')
    .eq('organization_id', organizationId)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single();

  if (!orgUser) {
    console.error('No admin/owner found for organization');
    return { totalProcessed: 0, totalCreated: 0, totalUpdated: 0, cancelled: false };
  }

  // Fetch blocked client IDs from cliente_contrato endpoint
  console.log('Fetching blocked clients from cliente_contrato...');
  const blockedClientIds = await fetchBlockedClientIds(apiUrl, apiToken, contractsApiUrl);

  while (hasMore) {
    // Check cancelled once per page
    if (await checkCancelled(supabaseAdmin, logId)) {
      console.log('Sync cancelled by user');
      return { totalProcessed, totalCreated, totalUpdated, cancelled: true };
    }

    const data = await fetchIxcData(apiUrl, apiToken, 'cliente', page, 500);
    const records = data.registros || data.rows || [];

    // On first page, save total_records for progress tracking
    if (page === 1) {
      const totalRecords = parseInt(data.total) || 0;
      console.log(`[DIAG] API reports total clients: ${totalRecords} (data.total=${data.total})`);
      if (logId) {
        await supabaseAdmin.from('integration_sync_log')
          .update({ total_records: totalRecords })
          .eq('id', logId);
      }
    }
    
    if (!Array.isArray(records) || records.length === 0) {
      hasMore = false;
      break;
    }

    // Collect all valid client IDs from this page
    const pageClients = records
      .map((r: IXCClient) => ({ ...r, _clientId: r.id?.toString() }))
      .filter((r: any) => r._clientId);

    const clientIds = pageClients.map((r: any) => r._clientId);

    // 1 query: fetch all existing clients for this page
    const { data: existingClients } = await supabaseAdmin
      .from('client_timelines')
      .select('id, client_id')
      .eq('organization_id', organizationId)
      .in('client_id', clientIds);

    const existingMap = new Map<string, string>();
    (existingClients || []).forEach((e: any) => existingMap.set(e.client_id, e.id));

    // Separate into updates and inserts
    const toUpdate: any[] = [];
    const toInsert: any[] = [];

    for (const client of pageClients) {
      const clientId = client._clientId;
      const existingId = existingMap.get(clientId);
      const isContractActive = client.ativo === 'S';
      const isBlocked = blockedClientIds.has(clientId);
      // is_active = contrato ativo E acesso não bloqueado
      const isActive = isContractActive && !isBlocked;
      const status = !isContractActive ? 'archived' : 'active';

      if (existingId) {
        toUpdate.push({
          id: existingId,
          client_name: client.razao || `Cliente ${clientId}`,
          is_active: isActive,
          status: status,
          updated_at: new Date().toISOString(),
        });
      } else {
        toInsert.push({
          client_id: clientId,
          client_name: client.razao || `Cliente ${clientId}`,
          is_active: isActive,
          organization_id: organizationId,
          start_date: client.data_cadastro || new Date().toISOString().split('T')[0],
          status: status,
          user_id: orgUser.user_id,
        });
      }
    }

    // Batch update existing records via SQL function (single query!)
    if (toUpdate.length > 0) {
      try {
        const { error } = await supabaseAdmin.rpc('batch_upsert_clients', {
          p_ids: toUpdate.map(r => r.id),
          p_names: toUpdate.map(r => r.client_name),
          p_active: toUpdate.map(r => r.is_active),
          p_statuses: toUpdate.map(r => r.status),
        });
        if (error) {
          console.error('Batch client update error:', error.message);
        } else {
          totalUpdated += toUpdate.length;
        }
      } catch (err) {
        console.error('Batch client update exception:', err);
      }
    }

    // Batch insert new records (single query!)
    if (toInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from('client_timelines')
        .insert(toInsert);
      if (error) {
        console.error('Batch insert error:', error.message);
      } else {
        totalCreated += toInsert.length;
      }
    }

    totalProcessed += pageClients.length;

    // Update progress after each page
    if (logId) {
      await supabaseAdmin.from('integration_sync_log')
        .update({ records_processed: totalProcessed })
        .eq('id', logId);
    }

    console.log(`Page ${page}: ${toInsert.length} created, ${toUpdate.length} updated (${totalProcessed} total)`);

    if (records.length < 500) {
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
    // Check cancelled once per page
    if (await checkCancelled(supabaseAdmin, logId)) {
      console.log('Sync cancelled by user');
      return { totalProcessed, totalCreated, totalUpdated, cancelled: true };
    }

    const data = await fetchIxcData(apiUrl, apiToken, 'fn_areceber', page, 500);
    const records = data.registros || data.rows || [];

    // On first page, save total_records for progress tracking
    if (page === 1 && logId) {
      const totalRecords = parseInt(data.total) || 0;
      await supabaseAdmin.from('integration_sync_log')
        .update({ total_records: totalRecords })
        .eq('id', logId);
    }
    
    if (!Array.isArray(records) || records.length === 0) {
      hasMore = false;
      break;
    }

    // Collect all unique client IXC IDs from this page
    const validRecords = records
      .map((r: IXCFatura) => ({ ...r, _clientId: r.id_cliente?.toString() }))
      .filter((r: any) => r._clientId);

    const uniqueClientIds = [...new Set(validRecords.map((r: any) => r._clientId))];

    // 1 query: fetch all timelines for these clients
    const { data: timelines } = await supabaseAdmin
      .from('client_timelines')
      .select('id, client_id')
      .eq('organization_id', organizationId)
      .in('client_id', uniqueClientIds);

    const timelineMap = new Map<string, string>();
    (timelines || []).forEach((t: any) => timelineMap.set(t.client_id, t.id));

    // Build boleto refs for batch lookup
    const boletoRefs: string[] = [];
    const validFaturas: any[] = [];

    for (const fatura of validRecords) {
      const timelineId = timelineMap.get(fatura._clientId);
      if (!timelineId) continue;
      const ixcRef = `Fatura IXC #${fatura.id}`;
      boletoRefs.push(ixcRef);
      validFaturas.push({ ...fatura, _timelineId: timelineId, _ixcRef: ixcRef });
    }

    // 1 query: fetch all existing boletos by description
    let existingBoletosMap = new Map<string, string>();
    if (boletoRefs.length > 0) {
      const timelineIds = [...new Set(validFaturas.map((f: any) => f._timelineId))];
      const { data: existingBoletos } = await supabaseAdmin
        .from('client_boletos')
        .select('id, timeline_id, description')
        .in('timeline_id', timelineIds)
        .in('description', boletoRefs);

      (existingBoletos || []).forEach((b: any) => {
        existingBoletosMap.set(`${b.timeline_id}:${b.description}`, b.id);
      });
    }

    const toInsert: any[] = [];
    const toUpdateList: any[] = [];

    for (const fatura of validFaturas) {
      const key = `${fatura._timelineId}:${fatura._ixcRef}`;
      const existingId = existingBoletosMap.get(key);

      if (existingId) {
        toUpdateList.push({
          id: existingId,
          boleto_value: parseFloat(fatura.valor) || 0,
          due_date: fatura.data_vencimento,
          status: mapIxcStatus(fatura.status),
          updated_at: new Date().toISOString(),
        });
      } else {
        toInsert.push({
          timeline_id: fatura._timelineId,
          boleto_value: parseFloat(fatura.valor) || 0,
          due_date: fatura.data_vencimento,
          status: mapIxcStatus(fatura.status),
          description: fatura._ixcRef,
        });
      }
    }

    // Batch update via SQL function (single query!)
    if (toUpdateList.length > 0) {
      try {
        const { error } = await supabaseAdmin.rpc('batch_upsert_boletos', {
          p_ids: toUpdateList.map(r => r.id),
          p_values: toUpdateList.map(r => r.boleto_value),
          p_dates: toUpdateList.map(r => r.due_date),
          p_statuses: toUpdateList.map(r => r.status),
        });
        if (error) {
          console.error('Batch boleto update error:', error.message);
        } else {
          totalUpdated += toUpdateList.length;
        }
      } catch (err) {
        console.error('Batch boleto update exception:', err);
      }
    }

    // Batch insert (single query!)
    if (toInsert.length > 0) {
      const { error } = await supabaseAdmin
        .from('client_boletos')
        .insert(toInsert);
      if (error) {
        console.error('Batch boleto insert error:', error.message);
      } else {
        totalCreated += toInsert.length;
      }
    }

    totalProcessed += validRecords.length;

    // Update progress after each page
    if (logId) {
      await supabaseAdmin.from('integration_sync_log')
        .update({ records_processed: totalProcessed })
        .eq('id', logId);
    }

    console.log(`Boletos page ${page}: ${toInsert.length} created, ${toUpdateList.length} updated (${totalProcessed} total)`);

    if (records.length < 500) {
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
      .select('api_url, api_url_contracts, api_token')
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
    // Clean contracts URL if available
    const ixcApiUrlContracts = integrationConfig?.api_url_contracts;
    const cleanUrlContracts = ixcApiUrlContracts 
      ? ixcApiUrlContracts.replace(/\/+$/, '').replace(/\/[^\/]*\.(php|html?)$/i, '').replace(/\/(app|admin|adm|webservice).*$/i, '')
      : null;
    console.log(`IXC sync. Clean URL: ${cleanUrl}, Contracts URL: ${cleanUrlContracts || 'using base'}, Sync type: ${syncType}, Org: ${organizationId}`);

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
        const clientResult = await syncClients(supabaseAdmin, organizationId, cleanUrl, finalToken, logEntry?.id, cleanUrlContracts);
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
