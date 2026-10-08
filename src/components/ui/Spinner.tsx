import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`animate-spin text-amber-400 ${sizeMap[size]}`} />
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
    </div>
  );
};

export const FullPageLoader: React.FC<{ message?: string }> = ({
  message = 'Carregando sistema...',
}) => {
  return (
    <div className="min-h-screen w-full bg-[#080C14] flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-20 h-20 rounded-full bg-amber-500/10 animate-ping" />
        <div className="w-16 h-16 rounded-2xl bg-[#0F1E38] border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      </div>
      <h4 className="text-base font-semibold text-slate-200">{message}</h4>
      <p className="text-xs text-slate-500 mt-1">RN Precificação · Ambiente Seguro</p>
    </div>
  );
};
