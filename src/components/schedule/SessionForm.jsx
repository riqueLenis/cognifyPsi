import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Repeat, CalendarDays } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { addWeeks, addMonths, format } from 'date-fns';

export default function SessionForm({ session, patients, open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    date: '',
    start_time: '',
    end_time: '',
    duration_minutes: 50,
    session_type: 'individual',
    status: 'agendada',
    notes: '',
    price: '',
    payment_status: 'pendente',
  });
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState({
    frequency: 'semanal',
    count: 4,
  });

  useEffect(() => {
    if (session) {
      setFormData({
        patient_id: session.patient_id || '',
        patient_name: session.patient_name || '',
        date: session.date || '',
        start_time: session.start_time || '',
        end_time: session.end_time || '',
        duration_minutes: session.duration_minutes || 50,
        session_type: session.session_type || 'individual',
        status: session.status || 'agendada',
        notes: session.notes || '',
        price: session.price || '',
        payment_status: session.payment_status || 'pendente',
      });
      setIsRecurring(false);
    } else {
      setFormData({
        patient_id: '',
        patient_name: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        duration_minutes: 50,
        session_type: 'individual',
        status: 'agendada',
        notes: '',
        price: '',
        payment_status: 'pendente',
      });
      setIsRecurring(false);
      setRecurrence({ frequency: 'semanal', count: 4 });
    }
  }, [session, open]);

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setFormData(prev => ({
      ...prev,
      patient_id: patientId,
      patient_name: patient?.full_name || '',
    }));
  };

  const handleTimeChange = (startTime) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours);
    endDate.setMinutes(minutes + formData.duration_minutes);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    
    setFormData(prev => ({
      ...prev,
      start_time: startTime,
      end_time: endTime,
    }));
  };

  const generateRecurringSessions = () => {
    const sessions = [];
    let currentDate = new Date(formData.date);
    
    for (let i = 0; i < recurrence.count; i++) {
      sessions.push({
        ...formData,
        date: format(currentDate, 'yyyy-MM-dd'),
        recurrence_id: `rec_${Date.now()}`,
      });
      
      switch (recurrence.frequency) {
        case 'semanal':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'quinzenal':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'mensal':
          currentDate = addMonths(currentDate, 1);
          break;
        default:
          currentDate = addWeeks(currentDate, 1);
      }
    }
    
    return sessions;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (isRecurring && !session) {
      const sessions = generateRecurringSessions();
      for (const sess of sessions) {
        await onSave(sess);
      }
    } else {
      await onSave(formData);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {session ? 'Editar Sessão' : 'Nova Sessão'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <Label htmlFor="patient">Paciente *</Label>
            <Select 
              value={formData.patient_id} 
              onValueChange={handlePatientChange}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione o paciente" />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="start_time">Horário *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => handleTimeChange(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session_type">Tipo de Sessão</Label>
              <Select 
                value={formData.session_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, session_type: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="casal">Casal</SelectItem>
                  <SelectItem value="familia">Família</SelectItem>
                  <SelectItem value="grupo">Grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duração (min)</Label>
              <Select 
                value={String(formData.duration_minutes)} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: Number(value) }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="50">50 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                  <SelectItem value="90">90 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Valor (R$)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="payment_status">Pagamento</Label>
              <Select 
                value={formData.payment_status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="isento">Isento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1.5"
            />
          </div>

          {/* Recurrence */}
          {!session && (
            <div className="space-y-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-indigo-600" />
                  <Label className="text-indigo-700 font-medium">Sessão Recorrente</Label>
                </div>
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label htmlFor="frequency">Frequência</Label>
                    <Select 
                      value={recurrence.frequency} 
                      onValueChange={(value) => setRecurrence(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger className="mt-1.5 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="count">Quantidade de sessões</Label>
                    <Select 
                      value={String(recurrence.count)} 
                      onValueChange={(value) => setRecurrence(prev => ({ ...prev, count: Number(value) }))}
                    >
                      <SelectTrigger className="mt-1.5 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 sessões</SelectItem>
                        <SelectItem value="8">8 sessões</SelectItem>
                        <SelectItem value="12">12 sessões</SelectItem>
                        <SelectItem value="16">16 sessões</SelectItem>
                        <SelectItem value="24">24 sessões</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 text-sm text-indigo-600 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>
                      Serão criadas {recurrence.count} sessões ({recurrence.frequency === 'semanal' ? 'toda semana' : recurrence.frequency === 'quinzenal' ? 'a cada 2 semanas' : 'todo mês'})
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.patient_id}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {session ? 'Salvar Alterações' : 'Agendar Sessão'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}