import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const config = {
    info: {
      icon: Info,
      containerClasses: 'bg-sky-950/40 border-sky-800/60 text-sky-200',
      iconClasses: 'text-sky-400',
    },
    success: {
      icon: CheckCircle2,
      containerClasses: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200',
      iconClasses: 'text-emerald-400',
    },
    warning: {
      icon: AlertTriangle,
      containerClasses: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
      iconClasses: 'text-amber-400',
    },
    error: {
      icon: AlertCircle,
      containerClasses: 'bg-red-950/40 border-red-800/60 text-red-200',
      iconClasses: 'text-red-400',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all duration-200 ${config.containerClasses} ${className}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconClasses}`} />
      <div className="flex-1 text-left min-w-0">
        {title && <h5 className="font-semibold text-white mb-0.5">{title}</h5>}
        <div className="text-xs sm:text-sm leading-relaxed opacity-95">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity -mr-1 -mt-1"
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
