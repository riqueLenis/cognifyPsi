import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { 
  Phone, 
  Mail, 
  Calendar,
  MoreVertical,
  FileText,
  Trash2,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PatientCard({ patient, onEdit, onDelete }) {
  const statusColors = {
    ativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    inativo: 'bg-slate-100 text-slate-600 border-slate-200',
    alta: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const statusLabels = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    alta: 'Alta',
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'from-indigo-400 to-violet-500',
      'from-emerald-400 to-teal-500',
      'from-amber-400 to-orange-500',
      'from-rose-400 to-pink-500',
      'from-cyan-400 to-blue-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center text-white font-semibold text-lg bg-gradient-to-br shadow-lg",
          getAvatarColor(patient.full_name)
        )}>
          {patient.avatar_url ? (
            <img src={patient.avatar_url} alt={patient.full_name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            getInitials(patient.full_name)
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link 
                to={createPageUrl(`PatientDetail?id=${patient.id}`)}
                className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
              >
                {patient.full_name}
              </Link>
              <Badge 
                variant="outline" 
                className={cn("ml-2 text-xs", statusColors[patient.status])}
              >
                {statusLabels[patient.status]}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(patient)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl(`MedicalRecords?patient=${patient.id}`)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Prontuário
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(patient)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Mail className="w-4 h-4" />
              <span className="truncate">{patient.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Phone className="w-4 h-4" />
              <span>{patient.phone}</span>
            </div>
            {patient.birth_date && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(patient.birth_date), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}