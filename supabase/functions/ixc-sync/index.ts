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

async function fetchBlockedClientIds(apiUrl: string, apiToken: string): Promise<Set<string>> {
  const blockedIds = new Set<string>();
  
  // Try radusuarios endpoint which has actual connection status
  const endpoints = ['radusuarios', 'cliente_contrato'];
  
  for (const endpoint of endpoints) {
    let page = 1;
    let hasMore = true;
    let foundBlockedField = false;

    while (hasMore) {
      try {
        console.log(`Checking ${endpoint} for blocked status (page ${page})`);
        const data = await fetchIxcData(apiUrl, apiToken, endpoint, page, 500);
        const records = data.registros || data.rows || [];

        if (page === 1 && records.length > 0) {
          const fields = Object.keys(records[0]);
          console.log(`${endpoint} total: ${data.total || 0}, fields count: ${fields.length}`);
          // Log all fields that contain 'bloq', 'status', 'ativo', 'acesso'
          const relevantFields = fields.filter(f => 
            f.includes('bloq') || f.includes('status') || f.includes('ativo') || 
            f.includes('acesso') || f.includes('online') || f.includes('oper')
          );
          console.log(`${endpoint} relevant fields:`, JSON.stringify(relevantFields));
          
          // Log first 3 records' relevant field values
          for (let i = 0; i < Math.min(3, records.length); i++) {
            const vals: Record<string, any> = {};
            relevantFields.forEach(f => vals[f] = records[i][f]);
            if (records[i].id_cliente) vals.id_cliente = records[i].id_cliente;
            console.log(`${endpoint} sample[${i}]:`, JSON.stringify(vals));
          }
        }

        if (!Array.isArray(records) || records.length === 0) {
          break;
        }

        // Check for blocked status in various possible fields
        for (const record of records) {
          const clientId = (record.id_cliente || record.cliente_id)?.toString();
          if (!clientId) continue;
          
          // Check multiple possible field names for blocked status
          const statusFields = ['ativo', 'status', 'status_internet', 'bloqueado', 'operacao'];
          for (const field of statusFields) {
            const val = record[field]?.toString() || '';
            if (val.includes('Bloqueio') || val.includes('bloqueio') || 
                val === 'BA' || val === 'BM' || val === 'N' && field === 'bloqueado') {
              blockedIds.add(clientId);
              if (!foundBlockedField) {
                console.log(`Found blocked via ${endpoint}.${field}=${val} for client ${clientId}`);
                foundBlockedField = true;
              }
            }
          }
        }

        if (records.length < 500) break;
        page++;
      } catch (err) {
        console.error(`Error fetching ${endpoint}:`, err);
        break;
      }
    }

    if (blockedIds.size > 0) {
      console.log(`Found ${blockedIds.size} blocked clients via ${endpoint}`);
      break; // Found blocked clients, no need to check other endpoints
    }
  }

  console.log(`Total unique blocked client IDs: ${blockedIds.size}`);
  return blockedIds;
}

async function syncClients(supabaseAdmin: any, organizationId: string, apiUrl: string, apiToken: string, logId?: string) {
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
  const blockedClientIds = await fetchBlockedClientIds(apiUrl, apiToken);

  while (hasMore) {
    // Check cancelled once per page
    if (await checkCancelled(supabaseAdmin, logId)) {
      console.log('Sync cancelled by user');
      return { totalProcessed, totalCreated, totalUpdated, cancelled: true };
    }

    const data = await fetchIxcData(apiUrl, apiToken, 'cliente', page, 500);
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
