import React from 'react';
import { Package, ArrowLeftRight, BarChart3, Construction } from 'lucide-react';

export type GestaoEstoqueSubTab = 'produtos' | 'movimentacoes' | 'relatorios';

interface GestaoEstoqueViewProps {
  subTab: GestaoEstoqueSubTab;
}

const SUBTAB_CONFIG: Record<
  GestaoEstoqueSubTab,
  {
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
  }
> = {
  produtos: {
    title: 'Cadastro de Produtos',
    subtitle: 'Gestão de Estoque · Catálogo e registro de peças e materiais.',
    description:
      'O módulo de Cadastro de Produtos está em construção e será disponibilizado em breve.',
    icon: <Package className="w-5 h-5" />,
  },
  movimentacoes: {
    title: 'Movimentações',
    subtitle: 'Gestão de Estoque · Controle de entradas, saídas e ajustes.',
    description:
      'O módulo de Movimentações de estoque está em construção e será disponibilizado em breve.',
    icon: <ArrowLeftRight className="w-5 h-5" />,
  },
  relatorios: {
    title: 'Relatórios',
    subtitle: 'Gestão de Estoque · Análises, saldos e histórico de inventário.',
    description:
      'O módulo de Relatórios de estoque está em construção e será disponibilizado em breve.',
    icon: <BarChart3 className="w-5 h-5" />,
  },
};

export const GestaoEstoqueView: React.FC<GestaoEstoqueViewProps> = ({ subTab }) => {
  const config = SUBTAB_CONFIG[subTab];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              {config.icon}
            </div>
            <span>{config.title}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{config.subtitle}</p>
        </div>
      </div>

      {/* Presentation Canvas: Em construção */}
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center flex flex-col items-center justify-center min-h-[380px] shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-5 shadow-sm">
          <Construction className="w-8 h-8" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-md mb-3">
          Gestão de Estoque
        </span>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Em construção</h3>
        <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
          {config.description}
        </p>
      </div>
    </div>
  );
};
