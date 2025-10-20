import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Lightbulb, AlertCircle, Clock, MessageSquare, TrendingUp, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisData {
  risk_score: number;
  risk_level: 'baixo' | 'médio' | 'alto' | 'crítico';
  recommended_actions: string[];
  best_contact_time?: {
    day_of_week: string;
    time_range: string;
  };
  most_effective_channel?: string;
  payment_prediction?: {
    probability: number;
    estimated_date: string;
  };
  critical_alerts?: string[];
  insights: string;
}

interface AIAnalysisSectionProps {
  timelineId: string;
  clientName: string;
}

export const AIAnalysisSection = ({ timelineId, clientName }: AIAnalysisSectionProps) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'baixo':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'médio':
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'alto':
        return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'crítico':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-500';
    if (score <= 60) return 'text-yellow-500';
    if (score <= 80) return 'text-orange-500';
    return 'text-red-500';
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-collection-strategy', {
        body: { timeline_id: timelineId }
      });

      if (invokeError) {
        console.error('Invoke error details:', {
          message: invokeError.message,
          status: (invokeError as any).status,
          details: invokeError
        });
        
        if (invokeError.message?.includes('429') || invokeError.message?.includes('rate_limit')) {
          setError('Limite de análises atingido. Aguarde alguns instantes e tente novamente.');
        } else if (invokeError.message?.includes('402') || invokeError.message?.includes('payment_required')) {
          setError('Créditos insuficientes para análise de IA. Entre em contato com o suporte.');
        } else if (invokeError.message?.includes('insufficient_data')) {
          setError('Adicione pelo menos um evento na timeline antes de analisar.');
        } else if (invokeError.message?.includes('Invalid date') || invokeError.message?.includes('invalid dates')) {
          setError('Erro: Alguns eventos possuem datas inválidas (formato "--/--"). Corrija as datas dos eventos antes de analisar.');
        } else if (invokeError.message?.includes('ReferenceError') || invokeError.message?.includes('not defined')) {
          setError('Erro interno na análise. Por favor, tente novamente.');
        } else {
          setError(`Erro ao analisar: ${invokeError.message || 'Erro desconhecido'}. Verifique se todos os eventos estão com datas válidas.`);
        }
        return;
      }

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast({
          title: 'Análise concluída!',
          description: 'Insights gerados com sucesso.',
        });
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Erro inesperado ao analisar.');
    } finally {
      setLoading(false);
    }
  };

  const copyReport = () => {
    if (!analysis) return;

    const report = `
RELATÓRIO DE ANÁLISE DE COBRANÇA
Cliente: ${clientName}
Data: ${new Date().toLocaleDateString('pt-BR')}

SCORE DE RISCO: ${analysis.risk_score}/100 (${analysis.risk_level.toUpperCase()})

PRÓXIMAS AÇÕES:
${analysis.recommended_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

${analysis.best_contact_time ? `MELHOR CONTATO: ${analysis.best_contact_time.day_of_week} às ${analysis.best_contact_time.time_range}` : ''}
${analysis.most_effective_channel ? `CANAL PREFERIDO: ${analysis.most_effective_channel}` : ''}

${analysis.payment_prediction ? `PREVISÃO DE PAGAMENTO: ${analysis.payment_prediction.estimated_date} (${analysis.payment_prediction.probability}%)` : ''}

${analysis.critical_alerts && analysis.critical_alerts.length > 0 ? `
ALERTAS CRÍTICOS:
${analysis.critical_alerts.map((a, i) => `${i + 1}. ${a}`).join('\n')}
` : ''}

INSIGHTS:
${analysis.insights}
    `.trim();

    navigator.clipboard.writeText(report);
    toast({
      title: 'Relatório copiado!',
      description: 'O relatório foi copiado para a área de transferência.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Análise Inteligente
        </h3>
        {analysis && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        )}
      </div>

      {!analysis && !error && (
        <Card className="bg-card/50 border-green-500/30">
          <CardContent className="p-6 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-sm text-muted-foreground mb-4">
              Use IA para analisar o histórico de cobrança e receber recomendações personalizadas
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Risk Score */}
          <Card className="bg-card/50 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-5xl font-bold ${getRiskScoreColor(analysis.risk_score)}`}>
                    {analysis.risk_score}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Score de Risco</div>
                    <Badge className={getRiskColor(analysis.risk_level)}>
                      {analysis.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Recommended Actions */}
          <Card className="bg-card/50 border-green-500/30">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-green-500" />
                Próximas Ações Recomendadas
              </h4>
              <div className="space-y-2">
                {analysis.recommended_actions.map((action, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20"
                  >
                    <span className="text-green-500 font-bold text-sm">{i + 1}.</span>
                    <span className="text-sm flex-1">{action}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          {(analysis.best_contact_time || analysis.most_effective_channel) && (
            <div className="grid grid-cols-2 gap-4">
              {analysis.most_effective_channel && (
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <div className="text-xs text-muted-foreground mb-1">Melhor Canal</div>
                    <div className="font-semibold text-sm">{analysis.most_effective_channel}</div>
                  </CardContent>
                </Card>
              )}
              {analysis.best_contact_time && (
                <Card className="bg-card/50">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <div className="text-xs text-muted-foreground mb-1">Melhor Horário</div>
                    <div className="font-semibold text-sm">
                      {analysis.best_contact_time.day_of_week}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {analysis.best_contact_time.time_range}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Payment Prediction */}
          {analysis.payment_prediction && (
            <Card className="bg-card/50 border-blue-500/30">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Previsão de Pagamento
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Data Estimada</div>
                    <div className="font-semibold">{analysis.payment_prediction.estimated_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Probabilidade</div>
                    <div className="text-2xl font-bold text-blue-500">
                      {analysis.payment_prediction.probability}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Alerts */}
          {analysis.critical_alerts && analysis.critical_alerts.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Alertas Críticos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {analysis.critical_alerts.map((alert, i) => (
                    <li key={i} className="text-sm">{alert}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Insights */}
          <Card className="bg-blue-500/5 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-blue-400">Insights Detalhados</h4>
                  <p className="text-sm text-foreground/90 whitespace-pre-line">
                    {analysis.insights}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copy Report Button */}
          <Button
            onClick={copyReport}
            variant="outline"
            className="w-full"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Relatório Completo
          </Button>
        </motion.div>
      )}
    </div>
  );
};