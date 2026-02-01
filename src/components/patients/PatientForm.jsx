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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

export default function PatientForm({ patient, open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    cpf: '',
    gender: '',
    address: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_cpf: '',
    emergency_contact: '',
    emergency_phone: '',
    health_insurance: '',
    health_insurance_number: '',
    status: 'ativo',
    notes: '',
    consent_lgpd: false,
  });

  const isMinor = () => {
    if (!formData.birth_date) return false;
    const birthDate = new Date(formData.birth_date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 < 18;
    }
    return age < 18;
  };
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        full_name: patient.full_name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        birth_date: patient.birth_date || '',
        cpf: patient.cpf || '',
        gender: patient.gender || '',
        address: patient.address || '',
        guardian_name: patient.guardian_name || '',
        guardian_phone: patient.guardian_phone || '',
        guardian_cpf: patient.guardian_cpf || '',
        emergency_contact: patient.emergency_contact || '',
        emergency_phone: patient.emergency_phone || '',
        health_insurance: patient.health_insurance || '',
        health_insurance_number: patient.health_insurance_number || '',
        status: patient.status || 'ativo',
        notes: patient.notes || '',
        consent_lgpd: patient.consent_lgpd || false,
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        birth_date: '',
        cpf: '',
        gender: '',
        address: '',
        guardian_name: '',
        guardian_phone: '',
        guardian_cpf: '',
        emergency_contact: '',
        emergency_phone: '',
        health_insurance: '',
        health_insurance_number: '',
        status: 'ativo',
        notes: '',
        consent_lgpd: false,
      });
    }
  }, [patient, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const dataToSave = {
      ...formData,
      consent_date: formData.consent_lgpd ? new Date().toISOString() : null,
    };
    
    await onSave(dataToSave);
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {patient ? 'Editar Paciente' : 'Novo Paciente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Informações Pessoais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  placeholder="(00) 00000-0000"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="gender">Gênero</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => handleChange('gender', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Guardian Info (for minors) */}
          {isMinor() && (
            <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="text-sm font-medium text-amber-700 uppercase tracking-wider">
                👶 Responsável pela Criança/Adolescente
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="guardian_name">Nome do Responsável *</Label>
                  <Input
                    id="guardian_name"
                    value={formData.guardian_name}
                    onChange={(e) => handleChange('guardian_name', e.target.value)}
                    required={isMinor()}
                    className="mt-1.5 bg-white"
                  />
                </div>

                <div>
                  <Label htmlFor="guardian_phone">Telefone do Responsável *</Label>
                  <Input
                    id="guardian_phone"
                    value={formData.guardian_phone}
                    onChange={(e) => handleChange('guardian_phone', e.target.value)}
                    required={isMinor()}
                    placeholder="(00) 00000-0000"
                    className="mt-1.5 bg-white"
                  />
                </div>

                <div>
                  <Label htmlFor="guardian_cpf">CPF do Responsável</Label>
                  <Input
                    id="guardian_cpf"
                    value={formData.guardian_cpf}
                    onChange={(e) => handleChange('guardian_cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className="mt-1.5 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Contato de Emergência
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact">Nome</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => handleChange('emergency_contact', e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="emergency_phone">Telefone</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={(e) => handleChange('emergency_phone', e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Health Insurance */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Convênio
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="health_insurance">Convênio</Label>
                <Input
                  id="health_insurance"
                  value={formData.health_insurance}
                  onChange={(e) => handleChange('health_insurance', e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="health_insurance_number">Número do Convênio</Label>
                <Input
                  id="health_insurance_number"
                  value={formData.health_insurance_number}
                  onChange={(e) => handleChange('health_insurance_number', e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="mt-1.5"
            />
          </div>

          {/* LGPD Consent */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-700">Consentimento LGPD</p>
              <p className="text-sm text-slate-500">O paciente autoriza o tratamento de seus dados pessoais</p>
            </div>
            <Switch
              checked={formData.consent_lgpd}
              onCheckedChange={(checked) => handleChange('consent_lgpd', checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}