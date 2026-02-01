// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User,
  Clock,
  DollarSign,
  Shield,
  Save,
  Loader2,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const defaultWorkingHours = {
  monday: { start: '08:00', end: '18:00', active: true },
  tuesday: { start: '08:00', end: '18:00', active: true },
  wednesday: { start: '08:00', end: '18:00', active: true },
  thursday: { start: '08:00', end: '18:00', active: true },
  friday: { start: '08:00', end: '18:00', active: true },
  saturday: { start: '08:00', end: '12:00', active: false },
  sunday: { start: '08:00', end: '12:00', active: false },
};

const dayLabels = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export default function Settings() {
  const [settings, setSettings] = useState({
    clinic_name: '',
    psychologist_name: '',
    crp_number: '',
    email: '',
    phone: '',
    address: '',
    working_hours: defaultWorkingHours,
    session_duration: 50,
    session_price: 200,
    cancellation_policy_hours: 24,
    reminder_hours_before: 24,
    lgpd_policy_text: '',
  });
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: async () => {
      const allSettings = await base44.entities.ClinicSettings.list();
      return allSettings[0] || null;
    },
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        clinic_name: existingSettings.clinic_name || '',
        psychologist_name: existingSettings.psychologist_name || '',
        crp_number: existingSettings.crp_number || '',
        email: existingSettings.email || '',
        phone: existingSettings.phone || '',
        address: existingSettings.address || '',
        working_hours: existingSettings.working_hours || defaultWorkingHours,
        session_duration: existingSettings.session_duration || 50,
        session_price: existingSettings.session_price || 200,
        cancellation_policy_hours: existingSettings.cancellation_policy_hours || 24,
        reminder_hours_before: existingSettings.reminder_hours_before || 24,
        lgpd_policy_text: existingSettings.lgpd_policy_text || '',
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSettings?.id) {
        return base44.entities.ClinicSettings.update(existingSettings.id, data);
      } else {
        return base44.entities.ClinicSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
  });

  const handleSave = async () => {
    setSaving(true);
    await saveMutation.mutateAsync(settings);
    setSaving(false);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setSettings(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          [field]: value,
        },
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Tabs defaultValue="clinic" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="clinic">
            <Building className="w-4 h-4 mr-2" />
            Clínica
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Clock className="w-4 h-4 mr-2" />
            Horários
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="w-4 h-4 mr-2" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="lgpd">
            <Shield className="w-4 h-4 mr-2" />
            LGPD
          </TabsTrigger>
        </TabsList>

        {/* Clinic Settings */}
        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Informações da Clínica
              </CardTitle>
              <CardDescription>
                Configure as informações básicas do seu consultório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clinic_name">Nome da Clínica</Label>
                  <Input
                    id="clinic_name"
                    value={settings.clinic_name}
                    onChange={(e) => handleChange('clinic_name', e.target.value)}
                    placeholder="Ex: Clínica de Psicologia"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="psychologist_name">Nome do Psicólogo(a)</Label>
                  <Input
                    id="psychologist_name"
                    value={settings.psychologist_name}
                    onChange={(e) => handleChange('psychologist_name', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="crp_number">CRP</Label>
                  <Input
                    id="crp_number"
                    value={settings.crp_number}
                    onChange={(e) => handleChange('crp_number', e.target.value)}
                    placeholder="Ex: 06/12345"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="mt-1.5"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Horários de Atendimento
              </CardTitle>
              <CardDescription>
                Configure os dias e horários de funcionamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="session_duration">Duração Padrão da Sessão (min)</Label>
                  <Input
                    id="session_duration"
                    type="number"
                    value={settings.session_duration}
                    onChange={(e) => handleChange('session_duration', Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="cancellation_policy">Política de Cancelamento (horas)</Label>
                  <Input
                    id="cancellation_policy"
                    type="number"
                    value={settings.cancellation_policy_hours}
                    onChange={(e) => handleChange('cancellation_policy_hours', Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(dayLabels).map(([day, label]) => (
                  <div 
                    key={day} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border",
                      settings.working_hours[day]?.active 
                        ? "bg-white border-slate-200" 
                        : "bg-slate-50 border-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={settings.working_hours[day]?.active}
                        onCheckedChange={(checked) => handleWorkingHoursChange(day, 'active', checked)}
                      />
                      <span className={cn(
                        "font-medium",
                        !settings.working_hours[day]?.active && "text-slate-400"
                      )}>
                        {label}
                      </span>
                    </div>
                    {settings.working_hours[day]?.active && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={settings.working_hours[day]?.start}
                          onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-slate-400">até</span>
                        <Input
                          type="time"
                          value={settings.working_hours[day]?.end}
                          onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-500" />
                Configurações Financeiras
              </CardTitle>
              <CardDescription>
                Configure valores e políticas de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session_price">Valor Padrão da Sessão (R$)</Label>
                  <Input
                    id="session_price"
                    type="number"
                    value={settings.session_price}
                    onChange={(e) => handleChange('session_price', Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="reminder_hours">Lembrete de Pagamento (horas antes)</Label>
                  <Input
                    id="reminder_hours"
                    type="number"
                    value={settings.reminder_hours_before}
                    onChange={(e) => handleChange('reminder_hours_before', Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LGPD Settings */}
        <TabsContent value="lgpd">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Política de Privacidade (LGPD)
              </CardTitle>
              <CardDescription>
                Configure o texto de política de privacidade exibido aos pacientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.lgpd_policy_text}
                onChange={(e) => handleChange('lgpd_policy_text', e.target.value)}
                rows={10}
                placeholder="Insira aqui o texto da sua política de privacidade e termos de consentimento LGPD..."
                className="font-mono text-sm"
              />
              <p className="text-sm text-slate-500 mt-2">
                Este texto será exibido ao paciente durante o processo de consentimento LGPD.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}