// @ts-nocheck
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Edit,
  Plus,
  Shield,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import PatientForm from '../components/patients/PatientForm';
import SessionForm from '../components/schedule/SessionForm';
import RecordForm from '../components/records/RecordForm';

export default function PatientDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('id');

  const [showEditForm, setShowEditForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: patientId });
      return patients[0];
    },
    enabled: !!patientId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['patient-sessions', patientId],
    queryFn: () => base44.entities.Session.filter({ patient_id: patientId }),
    enabled: !!patientId,
  });

  const { data: records = [] } = useQuery({
    queryKey: ['patient-records', patientId],
    queryFn: () => base44.entities.MedicalRecord.filter({ patient_id: patientId }),
    enabled: !!patientId,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['patient-financials', patientId],
    queryFn: () => base44.entities.Financial.filter({ patient_id: patientId }),
    enabled: !!patientId,
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['all-patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.update(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      setShowEditForm(false);
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-sessions', patientId] });
      setShowSessionForm(false);
    },
  });

  const createRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicalRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-records', patientId] });
      setShowRecordForm(false);
    },
  });

  if (isLoading || !patient) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border p-6 animate-pulse">
            <div className="h-20 w-20 rounded-xl bg-slate-200 mb-4" />
            <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    ativo: 'bg-emerald-100 text-emerald-700',
    inativo: 'bg-slate-100 text-slate-600',
    alta: 'bg-blue-100 text-blue-700',
  };

  const completedSessions = sessions.filter(s => s.status === 'concluida').length;
  const totalPaid = financials.filter(f => f.status === 'pago').reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalPending = financials.filter(f => f.status === 'pendente').reduce((sum, f) => sum + (f.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild className="gap-2">
        <Link to={createPageUrl('Patients')}>
          <ArrowLeft className="w-4 h-4" />
          Voltar para Pacientes
        </Link>
      </Button>

      {/* Patient Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-500/25 mb-4">
                {patient.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-slate-800">{patient.full_name}</h2>
              <Badge variant="outline" className={cn("mt-2", statusColors[patient.status])}>
                {patient.status === 'ativo' ? 'Ativo' : patient.status === 'inativo' ? 'Inativo' : 'Alta'}
              </Badge>

              <div className="w-full mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{patient.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{patient.phone}</span>
                </div>
                {patient.birth_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      {format(parseISO(patient.birth_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{patient.address}</span>
                  </div>
                )}
              </div>

              <Button 
                variant="outline" 
                className="w-full mt-6"
                onClick={() => setShowEditForm(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Paciente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{sessions.length}</p>
                  <p className="text-xs text-slate-500">Sessões Totais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Heart className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{completedSessions}</p>
                  <p className="text-xs text-slate-500">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">R$ {totalPaid.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Pago</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100">
                  <DollarSign className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">R$ {totalPending.toFixed(0)}</p>
                  <p className="text-xs text-slate-500">Pendente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="records">Prontuário</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de Sessões</CardTitle>
              <Button onClick={() => setShowSessionForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Sessão
              </Button>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhuma sessão registrada</p>
              ) : (
                <div className="space-y-3">
                  {sessions.sort((a, b) => b.date.localeCompare(a.date)).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-slate-800">
                            {format(parseISO(session.date), 'dd', { locale: ptBR })}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(parseISO(session.date), 'MMM', { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{session.start_time} - {session.end_time}</p>
                          <p className="text-sm text-slate-500">
                            {session.session_type === 'online' ? 'Online' : 'Presencial'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn(
                        session.status === 'concluida' && 'bg-emerald-100 text-emerald-700',
                        session.status === 'cancelada' && 'bg-red-100 text-red-700',
                        session.status === 'agendada' && 'bg-blue-100 text-blue-700'
                      )}>
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Prontuário</CardTitle>
              <Button onClick={() => setShowRecordForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Registro
              </Button>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum registro no prontuário</p>
              ) : (
                <div className="space-y-3">
                  {records.sort((a, b) => b.created_date.localeCompare(a.created_date)).map((record) => (
                    <div key={record.id} className="p-4 rounded-xl border border-slate-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-2">{record.record_type}</Badge>
                          <h4 className="font-medium text-slate-800">{record.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">
                            {format(parseISO(record.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        {record.is_confidential && (
                          <Shield className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              {financials.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum registro financeiro</p>
              ) : (
                <div className="space-y-3">
                  {financials.map((fin) => (
                    <div key={fin.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200">
                      <div>
                        <p className="font-medium text-slate-800">{fin.description}</p>
                        <p className="text-sm text-slate-500">{fin.due_date}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-bold",
                          fin.type === 'receita' ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          {fin.type === 'receita' ? '+' : '-'} R$ {fin.amount?.toFixed(2)}
                        </p>
                        <Badge variant="outline" className={cn(
                          fin.status === 'pago' && 'bg-emerald-100 text-emerald-700',
                          fin.status === 'pendente' && 'bg-amber-100 text-amber-700'
                        )}>
                          {fin.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações Completas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-500 uppercase text-sm">Dados Pessoais</h4>
                  <div className="space-y-2">
                    <p><span className="text-slate-500">CPF:</span> {patient.cpf || '-'}</p>
                    <p><span className="text-slate-500">Gênero:</span> {patient.gender || '-'}</p>
                    <p><span className="text-slate-500">Endereço:</span> {patient.address || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-500 uppercase text-sm">Contato de Emergência</h4>
                  <div className="space-y-2">
                    <p><span className="text-slate-500">Nome:</span> {patient.emergency_contact || '-'}</p>
                    <p><span className="text-slate-500">Telefone:</span> {patient.emergency_phone || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-500 uppercase text-sm">Convênio</h4>
                  <div className="space-y-2">
                    <p><span className="text-slate-500">Nome:</span> {patient.health_insurance || '-'}</p>
                    <p><span className="text-slate-500">Número:</span> {patient.health_insurance_number || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-500 uppercase text-sm">LGPD</h4>
                  <div className="space-y-2">
                    <p><span className="text-slate-500">Consentimento:</span> {patient.consent_lgpd ? '✅ Autorizado' : '❌ Não autorizado'}</p>
                    {patient.consent_date && (
                      <p><span className="text-slate-500">Data:</span> {format(parseISO(patient.consent_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    )}
                  </div>
                </div>
              </div>
              {patient.notes && (
                <div className="mt-6">
                  <h4 className="font-medium text-slate-500 uppercase text-sm mb-2">Observações</h4>
                  <p className="text-slate-700">{patient.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PatientForm
        patient={patient}
        open={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={(data) => updateMutation.mutateAsync(data)}
      />

      <SessionForm
        session={{ patient_id: patientId, patient_name: patient.full_name }}
        patients={allPatients}
        open={showSessionForm}
        onClose={() => setShowSessionForm(false)}
        onSave={(data) => createSessionMutation.mutateAsync(data)}
      />

      <RecordForm
        patientId={patientId}
        open={showRecordForm}
        onClose={() => setShowRecordForm(false)}
        onSave={(data) => createRecordMutation.mutateAsync(data)}
      />
    </div>
  );
}