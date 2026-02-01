// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import StatsCard from '../components/ui/StatsCard';
import TransactionForm from '../components/financial/TransactionForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Financial() {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));

  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: financials = [], isLoading } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list('-due_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Financial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      setShowForm(false);
      toast.success('Transação criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Financial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      setShowForm(false);
      setEditingTransaction(null);
      toast.success('Transação atualizada com sucesso!');
    },
  });

  const handleSave = async (data) => {
    if (editingTransaction) {
      await updateMutation.mutateAsync({ id: editingTransaction.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleMarkPaid = async (transaction) => {
    await updateMutation.mutateAsync({
      id: transaction.id,
      data: { 
        ...transaction, 
        status: 'pago',
        payment_date: new Date().toISOString().split('T')[0]
      }
    });
  };

  // Filter by month
  const monthStart = startOfMonth(new Date(monthFilter + '-01'));
  const monthEnd = endOfMonth(monthStart);
  
  const monthlyFinancials = financials.filter(f => {
    const dueDate = f.due_date ? new Date(f.due_date) : null;
    return dueDate && dueDate >= monthStart && dueDate <= monthEnd;
  });

  // Calculate stats
  const totalReceitas = monthlyFinancials
    .filter(f => f.type === 'receita')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const totalDespesas = monthlyFinancials
    .filter(f => f.type === 'despesa')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const receitasPagas = monthlyFinancials
    .filter(f => f.type === 'receita' && f.status === 'pago')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const receitasPendentes = monthlyFinancials
    .filter(f => f.type === 'receita' && f.status === 'pendente')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const saldo = receitasPagas - totalDespesas;

  // Filter for table
  const filteredFinancials = monthlyFinancials.filter(f => {
    const matchesSearch = f.description?.toLowerCase().includes(search.toLowerCase()) ||
                          f.patient_name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || f.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Chart data
  const categoryData = monthlyFinancials.reduce((acc, f) => {
    const category = f.category || 'outros';
    if (!acc[category]) {
      acc[category] = { name: category, receita: 0, despesa: 0 };
    }
    if (f.type === 'receita') {
      acc[category].receita += f.amount || 0;
    } else {
      acc[category].despesa += f.amount || 0;
    }
    return acc;
  }, {});

  const chartData = Object.values(categoryData);

  const pieData = [
    { name: 'Pago', value: receitasPagas, color: '#10b981' },
    { name: 'Pendente', value: receitasPendentes, color: '#f59e0b' },
    { name: 'Despesas', value: totalDespesas, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const statusColors = {
    pago: 'bg-emerald-100 text-emerald-700',
    pendente: 'bg-amber-100 text-amber-700',
    atrasado: 'bg-red-100 text-red-700',
    cancelado: 'bg-slate-100 text-slate-600',
  };

  const categoryLabels = {
    sessao: 'Sessão',
    avaliacao: 'Avaliação',
    relatorio: 'Relatório',
    aluguel: 'Aluguel',
    material: 'Material',
    marketing: 'Marketing',
    software: 'Software',
    outros: 'Outros',
  };

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-48"
        />
        <Button 
          onClick={() => { setEditingTransaction(null); setShowForm(true); }}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Receitas" 
          value={`R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          variant="emerald"
        />
        <StatsCard 
          title="Total Despesas" 
          value={`R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          variant="rose"
        />
        <StatsCard 
          title="Saldo" 
          value={`R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant={saldo >= 0 ? 'indigo' : 'rose'}
        />
        <StatsCard 
          title="Pendentes" 
          value={`R$ ${receitasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          variant="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receitas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar dataKey="receita" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição Financeira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFinancials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredFinancials.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.type === 'receita' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium">{transaction.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.patient_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[transaction.category] || transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.due_date 
                        ? format(parseISO(transaction.due_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className={cn(
                      "font-semibold",
                      transaction.type === 'receita' ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {transaction.type === 'receita' ? '+' : '-'} R$ {transaction.amount?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[transaction.status]}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.status === 'pendente' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleMarkPaid(transaction)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Pago
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setShowForm(true);
                          }}
                        >
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Modal */}
      <TransactionForm
        transaction={editingTransaction}
        patients={patients}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingTransaction(null); }}
        onSave={handleSave}
      />
    </div>
  );
}