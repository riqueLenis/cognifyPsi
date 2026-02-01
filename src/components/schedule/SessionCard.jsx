import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { 
  Clock, 
  User,
  Video,
  Users,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function SessionCard({ session, onStatusChange, onEdit, onDelete }) {
  const statusConfig = {
    agendada: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
    confirmada: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
    em_andamento: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
    concluida: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle },
    cancelada: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    falta: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
  };

  const typeIcons = {
    individual: User,
    online: Video,
    casal: Users,
    familia: Users,
    grupo: Users,
  };

  const statusLabels = {
    agendada: 'Agendada',
    confirmada: 'Confirmada',
    em_andamento: 'Em Andamento',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
    falta: 'Falta',
  };

  const TypeIcon = typeIcons[session.session_type] || User;
  const StatusIcon = statusConfig[session.status]?.icon || Clock;

  return (
    <div className={cn(
      "group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-200",
      session.status === 'em_andamento' && "border-l-4 border-l-amber-400"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Time */}
          <div className="text-center min-w-[60px]">
            <p className="text-lg font-bold text-slate-800">{session.start_time}</p>
            <p className="text-xs text-slate-400">{session.end_time}</p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-slate-200" />

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <Link 
                to={createPageUrl(`PatientDetail?id=${session.patient_id}`)}
                className="font-medium text-slate-800 hover:text-indigo-600 transition-colors"
              >
                {session.patient_name}
              </Link>
              <Badge variant="outline" className={statusConfig[session.status]?.color}>
                {statusLabels[session.status]}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <TypeIcon className="w-3.5 h-3.5" />
                {session.session_type === 'online' ? 'Online' : 'Presencial'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {session.duration_minutes || 50} min
              </span>
              {session.payment_status && (
                <span className={cn(
                  "flex items-center gap-1",
                  session.payment_status === 'pago' ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  <DollarSign className="w-3.5 h-3.5" />
                  {session.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                </span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStatusChange(session, 'confirmada')}>
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
              Confirmar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(session, 'concluida')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como Concluída
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(session)}>
              Editar Sessão
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange(session, 'falta')} className="text-amber-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              Marcar Falta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(session, 'cancelada')} className="text-red-600">
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}