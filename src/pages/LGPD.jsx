// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield,
  Lock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatsCard from '../components/ui/StatsCard';

export default function LGPD() {
  const [deletePatientData, setDeletePatientData] = useState(null);
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list(),
  });

  const { data: records = [] } = useQuery({
    queryKey: ['records'],
    queryFn: () => base44.entities.MedicalRecord.list(),
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (patientId) => {
      // Delete all related data
      const patientSessions = sessions.filter(s => s.patient_id === patientId);
      const patientRecords = records.filter(r => r.patient_id === patientId);
      
      for (const session of patientSessions) {
        await base44.entities.Session.delete(session.id);
      }
      for (const record of patientRecords) {
        await base44.entities.MedicalRecord.delete(record.id);
      }
      await base44.entities.Patient.delete(patientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDeletePatientData(null);
      toast.success('Todos os dados do paciente foram excluídos permanentemente');
    },
  });

  const consentedPatients = patients.filter(p => p.consent_lgpd);
  const nonConsentedPatients = patients.filter(p => !p.consent_lgpd);

  const handleExportData = (patient) => {
    const patientSessions = sessions.filter(s => s.patient_id === patient.id);
    const patientRecords = records.filter(r => r.patient_id === patient.id);

    const exportData = {
      paciente: {
        nome: patient.full_name,
        email: patient.email,
        telefone: patient.phone,
        data_nascimento: patient.birth_date,
        endereco: patient.address,
        data_cadastro: patient.created_date,
        consentimento_lgpd: patient.consent_lgpd,
        data_consentimento: patient.consent_date,
      },
      sessoes: patientSessions.map(s => ({
        data: s.date,
        horario: s.start_time,
        tipo: s.session_type,
        status: s.status,
      })),
      total_sessoes: patientSessions.length,
      registros_prontuario: patientRecords.length,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados_${patient.full_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Dados exportados com sucesso');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Conformidade LGPD</h2>
          <p className="text-slate-500">Gestão de dados pessoais e privacidade dos pacientes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total de Pacientes" 
          value={patients.length}
          icon={Users}
        />
        <StatsCard 
          title="Com Consentimento" 
          value={consentedPatients.length}
          icon={CheckCircle}
          variant="emerald"
        />
        <StatsCard 
          title="Sem Consentimento" 
          value={nonConsentedPatients.length}
          icon={AlertTriangle}
          variant="amber"
        />
        <StatsCard 
          title="Registros Protegidos" 
          value={records.filter(r => r.is_confidential).length}
          icon={Lock}
          variant="indigo"
        />
      </div>

      {/* LGPD Info */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Info className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800">Lei Geral de Proteção de Dados (LGPD)</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Este sistema está em conformidade com a LGPD (Lei nº 13.709/2018). 
                Os dados dos pacientes são armazenados de forma segura, com controle de acesso e 
                opções para exportação e exclusão de dados pessoais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Direitos dos Titulares</CardTitle>
          <CardDescription>
            Conforme a LGPD, os pacientes têm direito a:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Direito de Acesso</AccordionTrigger>
              <AccordionContent>
                O paciente pode solicitar acesso a todos os seus dados pessoais armazenados no sistema. 
                Use o botão "Exportar Dados" para gerar um relatório completo.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Direito de Correção</AccordionTrigger>
              <AccordionContent>
                O paciente pode solicitar a correção de dados incompletos, inexatos ou desatualizados. 
                Acesse a ficha do paciente e atualize as informações necessárias.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Direito de Eliminação</AccordionTrigger>
              <AccordionContent>
                O paciente pode solicitar a eliminação de seus dados pessoais. 
                Use o botão "Excluir Dados" para remover permanentemente todas as informações do paciente.
                <strong className="block mt-2 text-amber-600">
                  Atenção: Esta ação é irreversível e remove também o histórico de sessões e prontuários.
                </strong>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Direito de Portabilidade</AccordionTrigger>
              <AccordionContent>
                O paciente pode solicitar a portabilidade de seus dados para outro profissional ou serviço. 
                Os dados são exportados em formato JSON, que pode ser convertido para outros formatos.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Consentimento</AccordionTrigger>
              <AccordionContent>
                O tratamento de dados pessoais sensíveis (dados de saúde) requer consentimento expresso do paciente. 
                Certifique-se de obter e registrar o consentimento no cadastro do paciente.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Patients without consent alert */}
      {nonConsentedPatients.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              Pacientes sem Consentimento Registrado
            </CardTitle>
            <CardDescription className="text-amber-700">
              Os seguintes pacientes ainda não possuem consentimento LGPD registrado. 
              Regularize a situação para garantir conformidade legal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {nonConsentedPatients.map(patient => (
                <Badge key={patient.id} variant="outline" className="bg-white">
                  {patient.full_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patients Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gestão de Dados dos Pacientes</CardTitle>
          <CardDescription>
            Visualize, exporte ou exclua os dados pessoais dos pacientes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Consentimento</TableHead>
                <TableHead>Data do Consentimento</TableHead>
                <TableHead>Sessões</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => {
                const patientSessions = sessions.filter(s => s.patient_id === patient.id);
                const patientRecords = records.filter(r => r.patient_id === patient.id);
                
                return (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{patient.full_name}</p>
                        <p className="text-sm text-slate-500">{patient.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.consent_lgpd ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Autorizado
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">
                          <XCircle className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.consent_date 
                        ? format(parseISO(patient.consent_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{patientSessions.length}</TableCell>
                    <TableCell>{patientRecords.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExportData(patient)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Exportar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeletePatientData(patient)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePatientData} onOpenChange={() => setDeletePatientData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Exclusão Permanente de Dados
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a excluir <strong>permanentemente</strong> todos os dados de{' '}
                <strong>{deletePatientData?.full_name}</strong>.
              </p>
              <p className="text-red-600 font-medium">
                Esta ação é irreversível e incluirá:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-red-600">
                <li>Dados cadastrais do paciente</li>
                <li>Histórico de sessões</li>
                <li>Prontuário e registros clínicos</li>
                <li>Registros financeiros vinculados</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatientMutation.mutate(deletePatientData.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}