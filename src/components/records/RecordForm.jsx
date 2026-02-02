// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function RecordForm({
  record,
  patientId,
  patients = [],
  open,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    patient_id: patientId || "",
    record_type: "evolucao",
    title: "",
    content: "",
    diagnosis_cid: "",
    treatment_plan: "",
    is_confidential: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData({
        patient_id: record.patient_id || patientId || "",
        record_type: record.record_type || "evolucao",
        title: record.title || "",
        content: record.content || "",
        diagnosis_cid: record.diagnosis_cid || "",
        treatment_plan: record.treatment_plan || "",
        is_confidential: record.is_confidential !== false,
      });
    } else {
      setFormData({
        patient_id: patientId || "",
        record_type: "evolucao",
        title: "",
        content: "",
        diagnosis_cid: "",
        treatment_plan: "",
        is_confidential: true,
      });
    }
  }, [record, patientId, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  const recordTypes = [
    { value: "anamnese", label: "Anamnese" },
    { value: "evolucao", label: "Evolução" },
    { value: "avaliacao", label: "Avaliação Psicológica" },
    { value: "encaminhamento", label: "Encaminhamento" },
    { value: "atestado", label: "Atestado" },
    { value: "relatorio", label: "Relatório" },
  ];

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link"],
      ["clean"],
    ],
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {record ? "Editar Registro" : "Novo Registro"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Patient Selection */}
          <div>
            <Label htmlFor="patient">Paciente *</Label>
            <Select
              value={formData.patient_id}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, patient_id: value }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="record_type">Tipo de Registro *</Label>
              <Select
                value={formData.record_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, record_type: value }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recordTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Conteúdo *</Label>
            <div className="mt-1.5">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, content: value }))
                }
                modules={quillModules}
                className="bg-white rounded-lg border border-input overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input [&_.ql-toolbar_button]:h-auto [&_.ql-toolbar_button]:w-auto [&_.ql-toolbar_button]:p-1 [&_.ql-toolbar_button_svg]:h-4 [&_.ql-toolbar_button_svg]:w-4 [&_.ql-container]:border-0 [&_.ql-container]:h-[260px] [&_.ql-editor]:h-[260px] [&_.ql-editor]:overflow-y-auto [&_.ql-editor]:text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="diagnosis_cid">CID (Diagnóstico)</Label>
              <Input
                id="diagnosis_cid"
                value={formData.diagnosis_cid}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    diagnosis_cid: e.target.value,
                  }))
                }
                placeholder="Ex: F41.1"
                className="mt-1.5"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-700">Confidencial</p>
                <p className="text-sm text-slate-500">
                  Visível apenas para o psicólogo
                </p>
              </div>
              <Switch
                checked={formData.is_confidential}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_confidential: checked }))
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="treatment_plan">Plano de Tratamento</Label>
            <div className="mt-1.5">
              <ReactQuill
                theme="snow"
                value={formData.treatment_plan}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, treatment_plan: value }))
                }
                modules={quillModules}
                className="bg-white rounded-lg border border-input overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input [&_.ql-toolbar_button]:h-auto [&_.ql-toolbar_button]:w-auto [&_.ql-toolbar_button]:p-1 [&_.ql-toolbar_button_svg]:h-4 [&_.ql-toolbar_button_svg]:w-4 [&_.ql-container]:border-0 [&_.ql-container]:h-[180px] [&_.ql-editor]:h-[180px] [&_.ql-editor]:overflow-y-auto [&_.ql-editor]:text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.patient_id ||
                !formData.title ||
                !formData.content
              }
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {record ? "Salvar Alterações" : "Criar Registro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
