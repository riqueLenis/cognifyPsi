// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Calendar,
  User,
  Shield,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import RecordForm from '../components/records/RecordForm';
import StatsCard from '../components/ui/StatsCard';

export default function MedicalRecords() {
  const urlParams = new URLSearchParams(window.location.search);
  const filterPatientId = urlParams.get('patient');

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [patientFilter, setPatientFilter] = useState(filterPatientId || 'all');

  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date'),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['records'],
    queryFn: () => base44.entities.MedicalRecord.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setShowForm(false);
      toast.success('Registro criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MedicalRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setShowForm(false);
      setEditingRecord(null);
      toast.success('Registro atualizado com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MedicalRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDeleteRecord(null);
      toast.success('Registro excluído com sucesso!');
    },
  });

  const handleSave = async (data) => {
    if (editingRecord) {
      await updateMutation.mutateAsync({ id: editingRecord.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const safeLower = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

  const getRecordDateValue = (record) =>
    record?.created_date ?? record?.createdAt ?? record?.created_at ?? record?.date ?? null;

  const formatRecordDate = (record, pattern) => {
    const raw = getRecordDateValue(record);
    if (!raw) return '—';
    try {
      const date = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (Number.isNaN(date.getTime())) return '—';
      return format(date, pattern, { locale: ptBR });
    } catch {
      return '—';
    }
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => String(p.id) === String(patientId));
    return patient?.full_name || patient?.name || patient?.email || 'Paciente não encontrado';
  };

  const filteredRecords = records.filter(record => {
    const patient = patients.find(p => String(p.id) === String(record.patient_id));
    const needle = safeLower(search);
    const matchesSearch = safeLower(record?.title).includes(needle) ||
                          safeLower(patient?.full_name).includes(needle) ||
                          safeLower(patient?.name).includes(needle) ||
                          safeLower(patient?.email).includes(needle);
    const matchesType = typeFilter === 'all' || record.record_type === typeFilter;
    const matchesPatient = patientFilter === 'all' || record.patient_id === patientFilter;
    return matchesSearch && matchesType && matchesPatient;
  });

  const recordTypeLabels = {
    anamnese: 'Anamnese',
    evolucao: 'Evolução',
    avaliacao: 'Avaliação',
    encaminhamento: 'Encaminhamento',
    atestado: 'Atestado',
    relatorio: 'Relatório',
  };

  const recordTypeStyles = {
    anamnese: { badge: 'bg-purple-100 text-purple-700', iconBg: 'bg-purple-100', icon: 'text-purple-700' },
    evolucao: { badge: 'bg-blue-100 text-blue-700', iconBg: 'bg-blue-100', icon: 'text-blue-700' },
    avaliacao: { badge: 'bg-emerald-100 text-emerald-700', iconBg: 'bg-emerald-100', icon: 'text-emerald-700' },
    encaminhamento: { badge: 'bg-amber-100 text-amber-700', iconBg: 'bg-amber-100', icon: 'text-amber-700' },
    atestado: { badge: 'bg-rose-100 text-rose-700', iconBg: 'bg-rose-100', icon: 'text-rose-700' },
    relatorio: { badge: 'bg-indigo-100 text-indigo-700', iconBg: 'bg-indigo-100', icon: 'text-indigo-700' },
    default: { badge: 'bg-slate-100 text-slate-700', iconBg: 'bg-slate-100', icon: 'text-slate-600' },
  };

  const stats = {
    total: records.length,
    filtered: filteredRecords.length,
    confidential: records.filter(r => r?.is_confidential).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Prontuários</h2>
          <p className="text-sm text-slate-500">Gerencie registros clínicos, evoluções e documentos.</p>
        </div>
        <Button 
          onClick={() => { setEditingRecord(null); setShowForm(true); }}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Registro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Total" value={stats.total} icon={FileText} />
        <StatsCard title="Filtrados" value={stats.filtered} icon={Filter} />
        <StatsCard title="Confidenciais" value={stats.confidential} icon={Shield} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative flex-1 w-full min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por título ou paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
            <Select value={patientFilter} onValueChange={setPatientFilter}>
              <SelectTrigger className="w-56">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="Paciente" />
                </div>
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Pacientes</SelectItem>
              {patients.map(patient => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="Tipo" />
                </div>
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {Object.entries(recordTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Nenhum registro encontrado</h3>
            <p className="text-slate-400 mt-1">Crie seu primeiro registro no prontuário</p>
            <Button 
              onClick={() => { setEditingRecord(null); setShowForm(true); }}
              className="mt-4"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Registro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            (() => {
              const styles = recordTypeStyles[record?.record_type] || recordTypeStyles.default;
              return (
            <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingRecord(record)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      styles.iconBg
                    )}>
                      <FileText className={cn("w-6 h-6", styles.icon)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={styles.badge}>
                          {recordTypeLabels[record.record_type] || 'Registro'}
                        </Badge>
                        {record.is_confidential && (
                          <Shield className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800">{record.title || 'Sem título'}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {getPatientName(record.patient_id)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatRecordDate(record, 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteRecord(record);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
              );
            })()
          ))}
        </div>
      )}

      {/* Form Modal */}
      <RecordForm
        record={editingRecord}
        patientId={patientFilter !== 'all' ? patientFilter : undefined}
        patients={patients}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingRecord(null); }}
        onSave={handleSave}
      />

      {/* View Modal */}
      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewingRecord && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={(recordTypeStyles[viewingRecord.record_type] || recordTypeStyles.default).badge}
                  >
                    {recordTypeLabels[viewingRecord.record_type] || 'Registro'}
                  </Badge>
                  {viewingRecord.is_confidential && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700">
                      <Shield className="w-3 h-3 mr-1" />
                      Confidencial
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{viewingRecord.title}</DialogTitle>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {getPatientName(viewingRecord.patient_id)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatRecordDate(viewingRecord, "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
              </DialogHeader>
              
              <div className="mt-6 space-y-6">
                {viewingRecord.diagnosis_cid && (
                  <div>
                    <h4 className="font-medium text-slate-500 uppercase text-sm mb-2">Diagnóstico (CID)</h4>
                    <p className="text-slate-700">{viewingRecord.diagnosis_cid}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-slate-500 uppercase text-sm mb-2">Conteúdo</h4>
                  <div 
                    className="prose prose-sm max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: viewingRecord.content }}
                  />
                </div>

                {viewingRecord.treatment_plan && (
                  <div>
                    <h4 className="font-medium text-slate-500 uppercase text-sm mb-2">Plano de Tratamento</h4>
                    <div 
                      className="prose prose-sm max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{ __html: viewingRecord.treatment_plan }}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => setViewingRecord(null)}>
                  Fechar
                </Button>
                <Button onClick={() => {
                  setEditingRecord(viewingRecord);
                  setViewingRecord(null);
                  setShowForm(true);
                }}>
                  Editar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRecord && deleteMutation.mutate(deleteRecord.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}