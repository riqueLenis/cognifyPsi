// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatsCard from '../components/ui/StatsCard';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
  const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list('-date'),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  // Calculate stats
  const activePatients = patients.filter(p => p.status === 'ativo').length;
  const todaySessions = sessions.filter(s => s.date === today);
  const monthSessions = sessions.filter(s => s.date >= monthStart && s.date <= monthEnd);
  const completedThisMonth = monthSessions.filter(s => s.status === 'concluida').length;
  
  const monthRevenue = financials
    .filter(f => f.type === 'receita' && f.status === 'pago' && f.due_date >= monthStart && f.due_date <= monthEnd)
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const pendingPayments = financials
    .filter(f => f.type === 'receita' && f.status === 'pendente')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const upcomingSessions = sessions
    .filter(s => s.date >= today && s.status !== 'cancelada' && s.status !== 'concluida')
    .slice(0, 5);

  const statusColors = {
    agendada: 'bg-blue-100 text-blue-700',
    confirmada: 'bg-emerald-100 text-emerald-700',
    em_andamento: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bem-vindo de volta! 👋</h2>
          <p className="text-slate-500 mt-1">
            Você tem {todaySessions.length} sessões agendadas para hoje
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600">
          <Link to={createPageUrl('Schedule')}>
            <Calendar className="w-4 h-4 mr-2" />
            Ver Agenda
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Pacientes Ativos"
          value={activePatients}
          subtitle={`${patients.length} total`}
          icon={Users}
          variant="indigo"
        />
        <StatsCard
          title="Sessões Hoje"
          value={todaySessions.length}
          subtitle={`${completedThisMonth} este mês`}
          icon={Calendar}
          variant="emerald"
        />
        <StatsCard
          title="Receita do Mês"
          value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="amber"
        />
        <StatsCard
          title="Pagamentos Pendentes"
          value={`R$ ${pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          variant="rose"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Sessões de Hoje</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={createPageUrl('Schedule')}>
                Ver todas <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todaySessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma sessão agendada para hoje</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to={createPageUrl('Schedule')}>
                    Agendar Sessão
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all",
                      session.status === 'em_andamento' && "border-l-4 border-l-amber-400"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-800">{session.start_time}</p>
                        <p className="text-xs text-slate-400">{session.end_time}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200" />
                      <div>
                        <p className="font-medium text-slate-800">{session.patient_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={statusColors[session.status]}>
                            {session.status === 'agendada' && 'Agendada'}
                            {session.status === 'confirmada' && 'Confirmada'}
                            {session.status === 'em_andamento' && 'Em Andamento'}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {session.session_type === 'online' ? '📹 Online' : '🏢 Presencial'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={createPageUrl(`PatientDetail?id=${session.patient_id}`)}>
                        Ver Paciente
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Upcoming */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to={createPageUrl('Patients')}>
                  <Users className="w-5 h-5 mb-2 text-indigo-500" />
                  <span className="text-sm">Novo Paciente</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to={createPageUrl('Schedule')}>
                  <Calendar className="w-5 h-5 mb-2 text-emerald-500" />
                  <span className="text-sm">Agendar</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to={createPageUrl('MedicalRecords')}>
                  <CheckCircle className="w-5 h-5 mb-2 text-amber-500" />
                  <span className="text-sm">Prontuário</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to={createPageUrl('AIAnalysis')}>
                  <Brain className="w-5 h-5 mb-2 text-violet-500" />
                  <span className="text-sm">Análise IA</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Próximas Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhuma sessão agendada
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-600">
                          {format(parseISO(session.date), 'dd', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {session.patient_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(parseISO(session.date), 'EEE', { locale: ptBR })} às {session.start_time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}