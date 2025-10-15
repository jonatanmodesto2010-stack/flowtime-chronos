import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Calculate metrics
    const now = new Date();
    const startDate = new Date(client.start_date);
    const dueDate = client.due_date ? new Date(client.due_date) : null;
    
    const totalEvents = allEvents.length;
    const resolvedEvents = allEvents.filter(e => e.status === 'resolved').length;
    const noResponseEvents = allEvents.filter(e => e.status === 'no_response').length;
    
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilDue = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = dueDate ? now > dueDate : false;
    const daysOverdue = isOverdue && dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const responseRate = totalEvents > 0 ? (resolvedEvents / totalEvents * 100).toFixed(1) : '0';
    const noResponseRate = totalEvents > 0 ? (noResponseEvents / totalEvents * 100).toFixed(1) : '0';

    // Prepare context for AI
    const contextForAI = `
Análise de Cliente - Sistema de Cobrança

DADOS DO CLIENTE:
- Nome: ${client.client_name}
- ID: ${client.client_id || 'N/A'}
- Status: ${client.is_active ? 'Ativo' : 'Inativo'}
- Valor do boleto: R$ ${parseFloat(client.boleto_value || '0').toFixed(2)}
- Data de início: ${startDate.toLocaleDateString('pt-BR')}
- Data de vencimento: ${dueDate ? dueDate.toLocaleDateString('pt-BR') : 'Não definida'}
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
${allEvents.slice(0, 20).map((e, i) => `
${i + 1}. Data: ${e.event_date} ${e.event_time || ''} | Status: ${e.status} | Descrição: ${e.description || 'Sem descrição'}
`).join('')}

CONTEXTO ADICIONAL:
- Método atual: Cobrança ${tags.includes('COBRANÇA') ? 'ativa' : 'padrão'}
- Posição na timeline: ${allEvents.length > 0 ? 'Com histórico' : 'Sem histórico'}

Analise este caso e forneça insights acionáveis para melhorar a estratégia de cobrança.
`;

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
      console.error('AI API Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limit', message: 'Limite de análises atingido. Aguarde alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'Créditos insuficientes. Adicione créditos para continuar.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
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
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});