// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Filter
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ensureFinancialForSession } from '@/lib/financialSync';
import SessionCard from '../components/schedule/SessionCard';
import SessionForm from '../components/schedule/SessionForm';

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const queryClient = useQueryClient();

  const syncedSessionIdsRef = useRef(new Set());

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'ativo' }),
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list('-date'),
  });

  // Backfill: garante que sessões antigas gerem lançamentos no Financeiro.
  useEffect(() => {
    if (!Array.isArray(sessions) || sessions.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const session of sessions) {
        if (cancelled) return;
        if (!session?.id) continue;
        if (syncedSessionIdsRef.current.has(session.id)) continue;
        syncedSessionIdsRef.current.add(session.id);

        try {
          await ensureFinancialForSession(base44, session);
        } catch {
          // Não bloqueia a tela de agenda se o financeiro falhar.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessions]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowForm(false);
      toast.success('Sessão agendada com sucesso!');
    },
  });


  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Session.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      toast.success('Sessão excluída com sucesso!');
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Session.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowForm(false);
      setEditingSession(null);
      toast.success('Sessão atualizada com sucesso!');
    },
  });

  const handleSave = async (data) => {
    const saved = editingSession
      ? await updateMutation.mutateAsync({ id: editingSession.id, data })
      : await createMutation.mutateAsync(data);

    if (saved?.id) {
      syncedSessionIdsRef.current.add(saved.id);
    }

    try {
      await ensureFinancialForSession(base44, saved);
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    } catch {
      toast.warning('Sessão salva, mas o Financeiro não atualizou automaticamente.');
    }

    return saved;
  };

  const handleStatusChange = async (session, newStatus) => {
    await updateMutation.mutateAsync({
      id: session.id,
      data: { ...session, status: newStatus }
    });
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setShowForm(true);
  };

  const handleDelete = async (session) => {
    if (!session?.id) return;

    try {
      const linked = await base44.entities.Financial.filter({ session_id: session.id });
      if (Array.isArray(linked) && linked.length) {
        await Promise.all(linked.map((t) => t?.id ? base44.entities.Financial.delete(t.id) : Promise.resolve()));
      }
    } catch {
    }

    await deleteMutation.mutateAsync(session.id);
  };

  // Get week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter sessions
  const getSessionsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.filter(s => {
      const matchesDate = s.date === dateStr;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesDate && matchesStatus;
    }).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const navigateWeek = (direction) => {
    setSelectedDate(prev => addDays(prev, direction * 7));
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const daySessionsCount = sessions.filter(s => s.date === selectedDateStr).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="agendada">Agendadas</SelectItem>
              <SelectItem value="confirmada">Confirmadas</SelectItem>
              <SelectItem value="concluida">Concluídas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => { setEditingSession(null); setShowForm(true); }}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isToday = format(day, 'yyyy-MM-dd') === todayStr;
          const isSelected = isSameDay(day, selectedDate);
          const daySessions = getSessionsForDate(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "p-3 rounded-xl border text-center transition-all",
                isSelected 
                  ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white border-transparent shadow-lg" 
                  : isToday 
                    ? "bg-indigo-50 border-indigo-200" 
                    : "bg-white border-slate-200 hover:border-indigo-200"
              )}
            >
              <p className={cn(
                "text-xs font-medium uppercase",
                isSelected ? "text-white/80" : "text-slate-400"
              )}>
                {format(day, 'EEE', { locale: ptBR })}
              </p>
              <p className={cn(
                "text-xl font-bold mt-1",
                isSelected ? "text-white" : "text-slate-800"
              )}>
                {format(day, 'd')}
              </p>
              {daySessions.length > 0 && (
                <div className={cn(
                  "mt-2 text-xs font-medium px-2 py-0.5 rounded-full",
                  isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                )}>
                  {daySessions.length} sessões
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
            <span className="text-sm text-slate-500">
              {daySessionsCount} sessões
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-100 rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          ) : getSessionsForDate(selectedDate).length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma sessão agendada para este dia</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { setEditingSession(null); setShowForm(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agendar Sessão
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {getSessionsForDate(selectedDate).map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <SessionForm
        session={editingSession}
        patients={patients}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingSession(null); }}
        onSave={handleSave}
      />
    </div>
  );
}