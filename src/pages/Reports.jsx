// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Users,
  DollarSign,
  Download,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatsCard from '../components/ui/StatsCard';

export default function Reports() {
  const parseDateOnlyLocal = (value) => {
    if (!value) return null;
    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day);
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const [period, setPeriod] = useState('6');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
  });

  // Calculate period range
  const endDate = new Date();
  const startDate = subMonths(endDate, parseInt(period));
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  // Monthly sessions data
  const sessionsPerMonth = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthSessions = sessions.filter(s => {
      const sessionDate = parseDateOnlyLocal(s.date);
      return sessionDate >= monthStart && sessionDate <= monthEnd;
    });

    return {
      month: format(month, 'MMM', { locale: ptBR }),
      total: monthSessions.length,
      concluidas: monthSessions.filter(s => s.status === 'concluida').length,
      canceladas: monthSessions.filter(s => s.status === 'cancelada' || s.status === 'falta').length,
    };
  });

  // Revenue per month
  const revenuePerMonth = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthFinancials = financials.filter(f => {
      const dueDate = parseDateOnlyLocal(f.due_date);
      return dueDate && dueDate >= monthStart && dueDate <= monthEnd;
    });

    const receitas = monthFinancials
      .filter(f => f.type === 'receita' && f.status === 'pago')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const despesas = monthFinancials
      .filter(f => f.type === 'despesa')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    return {
      month: format(month, 'MMM', { locale: ptBR }),
      receitas,
      despesas,
      lucro: receitas - despesas,
    };
  });

  // Session types distribution
  const sessionTypes = sessions.reduce((acc, session) => {
    const type = session.session_type || 'individual';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const sessionTypeData = Object.entries(sessionTypes).map(([name, value]) => ({
    name: name === 'individual' ? 'Individual' : 
          name === 'online' ? 'Online' : 
          name === 'casal' ? 'Casal' : 
          name === 'familia' ? 'Família' : 'Grupo',
    value
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Patient status distribution
  const patientStatusData = [
    { name: 'Ativos', value: patients.filter(p => p.status === 'ativo').length, color: '#10b981' },
    { name: 'Inativos', value: patients.filter(p => p.status === 'inativo').length, color: '#94a3b8' },
    { name: 'Alta', value: patients.filter(p => p.status === 'alta').length, color: '#6366f1' },
  ].filter(d => d.value > 0);

  // Calculate totals
  const totalRevenue = revenuePerMonth.reduce((sum, m) => sum + m.receitas, 0);
  const totalExpenses = revenuePerMonth.reduce((sum, m) => sum + m.despesas, 0);
  const totalSessions = sessionsPerMonth.reduce((sum, m) => sum + m.total, 0);
  const completedSessions = sessionsPerMonth.reduce((sum, m) => sum + m.concluidas, 0);
  const cancelledSessions = sessionsPerMonth.reduce((sum, m) => sum + m.canceladas, 0);
  const completionRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) : 0;

  // New patients per month
  const newPatientsPerMonth = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const newPatients = patients.filter(p => {
      const createdDate = p.created_date ? new Date(p.created_date) : null;
      return createdDate && createdDate >= monthStart && createdDate <= monthEnd;
    });

    return {
      month: format(month, 'MMM', { locale: ptBR }),
      novos: newPatients.length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Período:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Receita Total" 
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="emerald"
        />
        <StatsCard 
          title="Sessões Realizadas" 
          value={completedSessions}
          subtitle={`${completionRate}% de conclusão`}
          icon={CheckCircle}
          variant="indigo"
        />
        <StatsCard 
          title="Total Pacientes" 
          value={patients.length}
          subtitle={`${patients.filter(p => p.status === 'ativo').length} ativos`}
          icon={Users}
        />
        <StatsCard 
          title="Cancelamentos" 
          value={cancelledSessions}
          icon={XCircle}
          variant="rose"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sessions per Month */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sessões por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionsPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="concluidas" name="Concluídas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="canceladas" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Session Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipos de Sessão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sessionTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {sessionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenuePerMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => `R$ ${value.toFixed(2)}`}
                        contentStyle={{ borderRadius: '8px' }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="receitas" 
                        name="Receitas"
                        stroke="#10b981" 
                        fill="#10b98133" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="despesas" 
                        name="Despesas"
                        stroke="#ef4444" 
                        fill="#ef444433" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Profit per Month */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Lucro por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenuePerMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => `R$ ${value.toFixed(2)}`}
                        contentStyle={{ borderRadius: '8px' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lucro" 
                        name="Lucro"
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Patients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Novos Pacientes por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={newPatientsPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="novos" name="Novos Pacientes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Patient Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status dos Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={patientStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {patientStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}