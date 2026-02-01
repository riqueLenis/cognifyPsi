// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Brain,
  Loader2,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Heart,
  MessageSquare,
  Target,
  ThumbsUp,
  ThumbsDown,
  Meh
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AIAnalysis() {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'ativo' }),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['patient-sessions', selectedPatient],
    queryFn: () => base44.entities.Session.filter({ patient_id: selectedPatient }),
    enabled: !!selectedPatient,
  });

  const analyzeSession = async () => {
    if (!sessionNotes.trim()) {
      toast.error('Por favor, insira as notas da sessão para análise');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    const patient = patients.find(p => p.id === selectedPatient);
    const patientContext = patient 
      ? `Paciente: ${patient.full_name}, Histórico de sessões: ${sessions.length} sessões realizadas.`
      : '';

    const prompt = `Você é um assistente de psicologia clínica. Analise as seguintes notas de sessão e forneça uma análise de sentimentos detalhada.

${patientContext}

NOTAS DA SESSÃO:
${sessionNotes}

Analise e retorne um JSON com a seguinte estrutura:
{
  "overall_sentiment": "muito_negativo" | "negativo" | "neutro" | "positivo" | "muito_positivo",
  "sentiment_score": número de -1 a 1,
  "emotions_detected": ["lista de emoções principais identificadas"],
  "key_themes": ["temas principais abordados na sessão"],
  "risk_indicators": ["indicadores de risco identificados, se houver"],
  "positive_indicators": ["indicadores positivos identificados"],
  "therapeutic_progress": "avaliação do progresso terapêutico",
  "recommendations": ["recomendações para próximas sessões"],
  "summary": "resumo breve da análise"
}

Seja preciso e profissional na análise. Identifique padrões emocionais, sinais de alerta e progressos terapêuticos.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_sentiment: { type: "string" },
          sentiment_score: { type: "number" },
          emotions_detected: { type: "array", items: { type: "string" } },
          key_themes: { type: "array", items: { type: "string" } },
          risk_indicators: { type: "array", items: { type: "string" } },
          positive_indicators: { type: "array", items: { type: "string" } },
          therapeutic_progress: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" }
        }
      }
    });

    setAnalysis(result);
    setIsAnalyzing(false);
    toast.success('Análise concluída com sucesso!');
  };

  const sentimentConfig = {
    muito_negativo: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-100', label: 'Muito Negativo' },
    negativo: { icon: ThumbsDown, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Negativo' },
    neutro: { icon: Meh, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Neutro' },
    positivo: { icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Positivo' },
    muito_positivo: { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-100', label: 'Muito Positivo' },
  };

  const getSentimentColor = (score) => {
    if (score <= -0.6) return 'from-red-500 to-red-600';
    if (score <= -0.2) return 'from-orange-500 to-orange-600';
    if (score <= 0.2) return 'from-slate-400 to-slate-500';
    if (score <= 0.6) return 'from-emerald-400 to-emerald-500';
    return 'from-green-500 to-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Análise de Sentimentos com IA</h2>
          <p className="text-slate-500">Analise as notas das sessões e identifique padrões emocionais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Notas da Sessão
            </CardTitle>
            <CardDescription>
              Insira as anotações da sessão para análise de sentimentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Paciente (Opcional)</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notas da Sessão *</Label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Descreva o que foi discutido na sessão, comportamentos observados, emoções expressas pelo paciente..."
                rows={12}
                className="mt-1.5"
              />
            </div>

            <Button 
              onClick={analyzeSession}
              disabled={isAnalyzing || !sessionNotes.trim()}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="space-y-6">
          {!analysis && !isAnalyzing && (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-16">
                <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600">Nenhuma análise realizada</h3>
                <p className="text-slate-400 mt-1">
                  Insira as notas da sessão e clique em "Analisar com IA"
                </p>
              </CardContent>
            </Card>
          )}

          {isAnalyzing && (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-16">
                <Loader2 className="w-16 h-16 text-violet-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-slate-600">Analisando notas...</h3>
                <p className="text-slate-400 mt-1">
                  A IA está processando as informações
                </p>
              </CardContent>
            </Card>
          )}

          {analysis && (
            <>
              {/* Sentiment Overview */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Sentimento Geral</p>
                      <div className="flex items-center gap-3">
                        {analysis.overall_sentiment && sentimentConfig[analysis.overall_sentiment] && (
                          <>
                            <div className={cn(
                              "p-2 rounded-lg",
                              sentimentConfig[analysis.overall_sentiment].bg
                            )}>
                              {React.createElement(sentimentConfig[analysis.overall_sentiment].icon, {
                                className: cn("w-6 h-6", sentimentConfig[analysis.overall_sentiment].color)
                              })}
                            </div>
                            <span className={cn(
                              "text-xl font-bold",
                              sentimentConfig[analysis.overall_sentiment].color
                            )}>
                              {sentimentConfig[analysis.overall_sentiment].label}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {analysis.sentiment_score !== undefined && (
                      <div className="text-right">
                        <p className="text-sm text-slate-500 mb-1">Score</p>
                        <div className={cn(
                          "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                          getSentimentColor(analysis.sentiment_score)
                        )}>
                          {(analysis.sentiment_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Sentiment Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                          getSentimentColor(analysis.sentiment_score)
                        )}
                        style={{ width: `${((analysis.sentiment_score + 1) / 2) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Negativo</span>
                      <span>Neutro</span>
                      <span>Positivo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emotions & Themes */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      Emoções Detectadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.emotions_detected?.map((emotion, i) => (
                        <Badge key={i} variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      Temas Principais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.key_themes?.map((theme, i) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk & Positive Indicators */}
              {analysis.risk_indicators?.length > 0 && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      Indicadores de Risco
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.risk_indicators.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {analysis.positive_indicators?.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                      <TrendingUp className="w-4 h-4" />
                      Indicadores Positivos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.positive_indicators.map((pos, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                          {pos}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Summary & Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resumo da Análise</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700">{analysis.summary}</p>
                  
                  {analysis.therapeutic_progress && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-600">Progresso Terapêutico:</p>
                      <p className="text-sm text-slate-700 mt-1">{analysis.therapeutic_progress}</p>
                    </div>
                  )}

                  {analysis.recommendations?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-600 mb-2">Recomendações:</p>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}