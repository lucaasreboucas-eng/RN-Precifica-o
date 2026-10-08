import React from 'react';
import { BadgeDollarSign } from 'lucide-react';

export const GestaoPrecosView: React.FC = () => {
  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <span>Gestão de Preços</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Módulo de precificação, margens e custos da oficina.
          </p>
        </div>
      </div>

      {/* Clean placeholder canvas */}
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center flex flex-col items-center justify-center min-h-[360px] shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
          <BadgeDollarSign className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Aba Gestão de Preços
        </h3>
        <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
          Área pronta para receber a construção gradual das funcionalidades de precificação.
        </p>
      </div>
    </div>
  );
};
