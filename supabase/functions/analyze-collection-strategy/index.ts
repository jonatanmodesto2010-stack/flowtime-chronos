import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para formatar datas de forma segura
function safeFormatDate(dateValue: any, format: 'date' | 'datetime' = 'date'): string {
  if (!dateValue) return 'N/A';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    if (format === 'datetime') {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Error formatting date:', dateValue, error);
    return 'Data inválida';
  }
}

// Helper para formatar valores monetários
function safeFormatCurrency(value: any): string {
  try {
    const num = parseFloat(value || '0');
    return isNaN(num) ? 'R$ 0,00' : `R$ ${num.toFixed(2)}`;
  } catch (error) {
    return 'R$ 0,00';
  }
}

// Helper para formatar event_date (DD/MM)
function safeFormatEventDate(eventDate: any): string {
  if (!eventDate || eventDate === '--/--') return '--/--';
  return String(eventDate);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { timeline_id } = await req.json();

    if (!timeline_id) {
      return new Response(
        JSON.stringify({ error: 'timeline_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabaseClient
      .from('client_timelines')
      .select('*')
      .eq('id', timeline_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch timeline lines and events
    const { data: lines, error: linesError } = await supabaseClient
      .from('timeline_lines')
      .select('*')
      .eq('timeline_id', timeline_id)
      .order('position', { ascending: true });

    if (linesError) {
      console.error('Error fetching lines:', linesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch timeline data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all events for all lines
    let allEvents: any[] = [];
    if (lines && lines.length > 0) {
      for (const line of lines) {
        const { data: events, error: eventsError } = await supabaseClient
          .from('timeline_events')
          .select('*')
          .eq('line_id', line.id)
          .order('event_order', { ascending: true });

        if (!eventsError && events) {
          allEvents = [...allEvents, ...events];
        }
      }
    }

    // Validar se há dados suficientes para análise
    if (allEvents.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'insufficient_data', 
          message: 'Não há eventos suficientes para realizar a análise. Adicione pelo menos um evento na timeline.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log de debug
    console.log(`Processing timeline ${timeline_id} with ${allEvents.length} events`);
    console.log('Sample event:', allEvents[0] ? JSON.stringify(allEvents[0]) : 'No events');

  // ============================================
  // INFORMAÇÕES TEMPORAIS
  // ============================================
  const now = new Date();
  const startDate = new Date(client.start_date);
  const dueDate = client.due_date ? new Date(client.due_date) : null;
  
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilDue = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = dueDate ? now > dueDate : false;
  const daysOverdue = isOverdue && dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // ============================================
  // ANÁLISE TEMPORAL DETALHADA DOS EVENTOS
  // ============================================

  // 1. Análise por horário
  const eventsWithTime = allEvents.filter(e => e.event_time);
  const morningEvents = eventsWithTime.filter(e => {
    const hour = parseInt(e.event_time?.split(':')[0] || '0');
    return hour >= 6 && hour < 12;
  }).length;

  const afternoonEvents = eventsWithTime.filter(e => {
    const hour = parseInt(e.event_time?.split(':')[0] || '0');
    return hour >= 12 && hour < 18;
  }).length;

  const eveningEvents = eventsWithTime.filter(e => {
    const hour = parseInt(e.event_time?.split(':')[0] || '0');
    return hour >= 18 || hour < 6;
  }).length;

  // 2. Análise por dia da semana - com validação robusta
  const eventsByDay: Record<string, number> = {};
  let invalidDateCount = 0;
  
  allEvents.forEach(e => {
    if (!e.event_date || e.event_date === '--/--') {
      invalidDateCount++;
      return;
    }
    
    try {
      // Parse DD/MM ou DD/MM/YYYY
      const parts = e.event_date.trim().split('/');
      if (parts.length < 2) {
        invalidDateCount++;
        console.warn(`Invalid date format: ${e.event_date}`);
        return;
      }
      
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      const year = parts.length === 3 ? parseInt(parts[2]) : now.getFullYear();
      
      if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 0 || month > 11) {
        invalidDateCount++;
        console.warn(`Invalid date values: ${e.event_date}`);
        return;
      }
      
      const date = new Date(year, month, day);
      
      if (isNaN(date.getTime())) {
        invalidDateCount++;
        console.warn(`Invalid date object: ${e.event_date}`);
        return;
      }
      
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      eventsByDay[dayName] = (eventsByDay[dayName] || 0) + 1;
    } catch (error) {
      invalidDateCount++;
      console.error('Error parsing date:', e.event_date, error);
    }
  });
  
  console.log(`Total events: ${allEvents.length}, Invalid dates: ${invalidDateCount}, Valid dates: ${allEvents.length - invalidDateCount}`);

    const mostActiveDay = Object.entries(eventsByDay).sort((a, b) => b[1] - a[1])[0];

    // 3. Análise por posição
    const topEvents = allEvents.filter(e => e.position === 'top').length;
    const bottomEvents = allEvents.filter(e => e.position === 'bottom').length;

    // 4. Análise por ícone (tipo de interação)
    const eventsByIcon: Record<string, number> = {};
    allEvents.forEach(e => {
      eventsByIcon[e.icon] = (eventsByIcon[e.icon] || 0) + 1;
    });
    const mostUsedChannel = Object.entries(eventsByIcon).sort((a, b) => b[1] - a[1])[0];

    // Fetch tags
    const { data: tagData, error: tagError } = await supabaseClient
      .from('client_timeline_tags')
      .select(`
        tags:tag_id (
          name,
          color
        )
      `)
      .eq('timeline_id', timeline_id);

    const tags = tagData?.map((t: any) => t.tags?.name).filter(Boolean) || [];

    // ============================================
    // BUSCAR MÚLTIPLOS BOLETOS
    // ============================================
    const { data: boletos, error: boletosError } = await supabaseClient
      .from('client_boletos')
      .select('*')
      .eq('timeline_id', timeline_id)
      .order('due_date', { ascending: true });

    const totalBoletos = boletos?.length || 0;
    const boletosPendentes = boletos?.filter(b => b.status === 'pendente' || b.status === 'atrasado') || [];
    const totalPendente = boletosPendentes.reduce((sum, b) => sum + parseFloat(b.boleto_value || '0'), 0);
    const boletosVencidos = boletos?.filter(b => {
      const venc = new Date(b.due_date);
      return venc < now && b.status !== 'pago';
    }).length || 0;
    const proximoVencimento = boletosPendentes[0]?.due_date || null;

    // Calculate metrics
    
    const totalEvents = allEvents.length;
    const resolvedEvents = allEvents.filter(e => e.status === 'resolved').length;
    const noResponseEvents = allEvents.filter(e => e.status === 'no_response').length;

    const responseRate = totalEvents > 0 ? (resolvedEvents / totalEvents * 100).toFixed(1) : '0';
    const noResponseRate = totalEvents > 0 ? (noResponseEvents / totalEvents * 100).toFixed(1) : '0';

    // Prepare context for AI
    let contextForAI = '';
    try {
      contextForAI = `
Análise de Cliente - Sistema de Cobrança

DADOS DO CLIENTE:
- Nome: ${client.client_name}
- ID: ${client.client_id || 'N/A'}
- Status: ${client.is_active ? 'Ativo' : 'Inativo'}
- Status da Timeline: ${client.status || 'active'}
${client.completed_at ? `- Finalizada em: ${safeFormatDate(client.completed_at)}` : ''}
${client.completion_notes ? `- Observações de finalização: ${client.completion_notes}` : ''}
- Valor do boleto: ${safeFormatCurrency(client.boleto_value)}
- Data de início: ${safeFormatDate(client.start_date)}
- Data de vencimento: ${dueDate ? safeFormatDate(client.due_date) : 'Não definida'}
- Dias desde início: ${daysSinceStart}
- Dias até vencimento: ${daysUntilDue !== null ? daysUntilDue : 'N/A'}
- Em atraso: ${isOverdue ? `Sim (${daysOverdue} dias)` : 'Não'}
- Tags: ${tags.join(', ') || 'Nenhuma'}

MÉTRICAS DE INTERAÇÃO:
- Total de eventos: ${totalEvents}
- Taxa de resposta: ${responseRate}%
- Taxa de não resposta: ${noResponseRate}%
- Eventos resolvidos: ${resolvedEvents}
- Eventos sem resposta: ${noResponseEvents}
- Frequência de contato: ${totalEvents > 0 ? (totalEvents / Math.max(daysSinceStart, 1)).toFixed(2) : 0} eventos/dia

HISTÓRICO DE EVENTOS (últimos ${Math.min(allEvents.length, 20)}):
${allEvents.slice(0, 20).map((e, i) => {
  const eventDate = safeFormatEventDate(e.event_date);
  const eventTime = e.event_time || 'sem horário';
  const createdAt = safeFormatDate(e.created_at, 'datetime');
  const desc = e.description || 'Sem descrição';
  
  return `${i + 1}. 📅 ${eventDate} ${eventTime} | ${e.icon} | Posição: ${e.position} | Status: ${e.status} | Desc: ${desc} | Criado: ${createdAt}`;
}).join('\n')}

ANÁLISE TEMPORAL DOS EVENTOS:
- 🌅 Eventos pela manhã (6h-12h): ${morningEvents} (${totalEvents > 0 ? ((morningEvents/totalEvents)*100).toFixed(1) : 0}%)
- ☀️ Eventos pela tarde (12h-18h): ${afternoonEvents} (${totalEvents > 0 ? ((afternoonEvents/totalEvents)*100).toFixed(1) : 0}%)
- 🌙 Eventos à noite/madrugada: ${eveningEvents} (${totalEvents > 0 ? ((eveningEvents/totalEvents)*100).toFixed(1) : 0}%)
- 📊 Dia mais ativo: ${mostActiveDay ? `${mostActiveDay[0]} (${mostActiveDay[1]} eventos)` : 'N/A'}
- 🎯 Canal mais usado: ${mostUsedChannel ? `${mostUsedChannel[0]} (${mostUsedChannel[1]}x)` : 'N/A'}

DISTRIBUIÇÃO POR POSIÇÃO NA TIMELINE:
- ⬆️ Eventos no topo: ${topEvents} (${totalEvents > 0 ? ((topEvents/totalEvents)*100).toFixed(1) : 0}%)
- ⬇️ Eventos embaixo: ${bottomEvents} (${totalEvents > 0 ? ((bottomEvents/totalEvents)*100).toFixed(1) : 0}%)

INFORMAÇÕES FINANCEIRAS (MÚLTIPLOS BOLETOS):
- 💰 Total de boletos cadastrados: ${totalBoletos}
- 🟡 Boletos pendentes: ${boletosPendentes.length}
- ✅ Boletos pagos: ${boletos?.filter(b => b.status === 'pago').length || 0}
- ⏰ Boletos vencidos não pagos: ${boletosVencidos}
- 💵 Valor total pendente: ${safeFormatCurrency(totalPendente)}
- 📅 Próximo vencimento: ${proximoVencimento ? safeFormatDate(proximoVencimento) : 'N/A'}

${totalBoletos > 0 && boletos ? `LISTA DETALHADA DE BOLETOS:
${boletos.map((b, i) => {
  const valor = safeFormatCurrency(b.boleto_value);
  const vencimento = safeFormatDate(b.due_date);
  const desc = b.description ? ` | ${b.description}` : '';
  return `${i + 1}. Valor: ${valor} | Vencimento: ${vencimento} | Status: ${b.status}${desc}`;
}).join('\n')}` : ''}

CONTEXTO ADICIONAL:
- Método atual: Cobrança ${tags.includes('COBRANÇA') ? 'ativa' : 'padrão'}
- Posição na timeline: ${allEvents.length > 0 ? 'Com histórico' : 'Sem histórico'}

Analise este caso e forneça insights acionáveis para melhorar a estratégia de cobrança.
`;
    } catch (contextError) {
      console.error('Error building context for AI:', contextError);
      return new Response(
        JSON.stringify({ 
          error: 'context_build_error',
          message: 'Erro ao preparar dados para análise. Verifique se todos os campos estão preenchidos corretamente.',
          details: contextError instanceof Error ? contextError.message : 'Unknown error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
 
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em estratégias de cobrança B2B com foco em análise de dados e otimização de processos.

Sua função é analisar o histórico de cobrança de clientes e fornecer insights práticos e acionáveis para melhorar a efetividade das cobranças.

Considere:
- Padrões temporais (dias da semana, horários)
- Efetividade dos métodos de contato
- Sinais de inadimplência ou risco
- Histórico de respostas
- Tempo até vencimento
- Valor em questão

Seja específico, prático e direto nas recomendações.`
          },
          {
            role: 'user',
            content: contextForAI
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_collection',
              description: 'Retorna análise estruturada da estratégia de cobrança do cliente',
              parameters: {
                type: 'object',
                properties: {
                  risk_score: {
                    type: 'number',
                    description: 'Score de risco de inadimplência de 0 a 100',
                    minimum: 0,
                    maximum: 100
                  },
                  risk_level: {
                    type: 'string',
                    enum: ['baixo', 'médio', 'alto', 'crítico'],
                    description: 'Nível de risco categorizado'
                  },
                  recommended_actions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de 3-5 ações recomendadas prioritárias'
                  },
                  best_contact_time: {
                    type: 'object',
                    properties: {
                      day_of_week: { type: 'string', description: 'Melhor dia da semana para contato' },
                      time_range: { type: 'string', description: 'Melhor horário (ex: 9h-11h)' }
                    },
                    description: 'Melhor momento para contato baseado em padrões'
                  },
                  most_effective_channel: {
                    type: 'string',
                    description: 'Canal de comunicação mais efetivo (WhatsApp, Email, Telefone, etc)'
                  },
                  payment_prediction: {
                    type: 'object',
                    properties: {
                      probability: { type: 'number', description: 'Probabilidade de pagamento (0-100)' },
                      estimated_date: { type: 'string', description: 'Data estimada de pagamento' }
                    },
                    description: 'Previsão de pagamento'
                  },
                  critical_alerts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Alertas críticos que requerem atenção imediata'
                  },
                  insights: {
                    type: 'string',
                    description: 'Insights detalhados e contextualizados sobre o caso (2-3 parágrafos)'
                  }
                },
                required: ['risk_score', 'risk_level', 'recommended_actions', 'insights']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_collection' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'rate_limit', 
            message: 'Limite de análises atingido. Aguarde alguns instantes e tente novamente.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'payment_required', 
            message: 'Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage.' 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData, null, 2));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Save analysis to database
    const { error: saveError } = await supabaseClient
      .from('client_analysis_history')
      .insert({
        timeline_id,
        analysis_data: analysis,
        risk_score: analysis.risk_score,
        risk_level: analysis.risk_level
      });

    if (saveError) {
      console.error('Error saving analysis:', saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        metrics: {
          totalEvents,
          responseRate: parseFloat(responseRate),
          noResponseRate: parseFloat(noResponseRate),
          daysSinceStart,
          daysUntilDue,
          isOverdue,
          daysOverdue
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-collection-strategy:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: errorMessage,
        details: 'Erro ao processar análise. Verifique os logs para mais informações.',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});