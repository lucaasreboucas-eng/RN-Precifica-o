import React from 'react';
import {
  BadgeDollarSign,
  FileText,
  Package,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Shield,
  Users,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../context/ManagementContext';
import { Logo } from '../brand/Logo';

interface WelcomeViewProps {
  onSelectTab: (tabId: string) => void;
}

const getSubTabIcon = (tabId: string) => {
  switch (tabId) {
    case 'gestao-precos-orcamentos':
      return <FileText className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'gestao-estoque-produtos':
      return <Package className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'gestao-estoque-movimentacoes':
      return <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'gestao-estoque-relatorios':
      return <BarChart3 className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'configuracoes-perfis':
      return <Shield className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'configuracoes-usuarios':
      return <Users className="w-4 h-4 text-amber-600 shrink-0" />;
    default:
      return <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />;
  }
};

const getMainTabIcon = (tabId: string) => {
  switch (tabId) {
    case 'gestao-precos':
      return <BadgeDollarSign className="w-4 h-4 text-slate-500 shrink-0" />;
    case 'gestao-estoque':
      return <Package className="w-4 h-4 text-slate-500 shrink-0" />;
    case 'configuracoes':
      return <Settings className="w-4 h-4 text-slate-500 shrink-0" />;
    default:
      return <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />;
  }
};

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onSelectTab }) => {
  const { user } = useAuth();
  const { sidebarStructure } = useManagement();

  return (
    <div className="min-h-[calc(100vh-9rem)] flex flex-col justify-center py-6 text-left">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* Hero Welcome Banner */}
        <section className="bg-[#091120] border border-slate-800 rounded-2xl p-6 sm:p-10 text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-6 sm:gap-8">
            <div className="shrink-0 flex items-center justify-center">
              <Logo size="lg" showText={false} />
            </div>

            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{user?.fullName || 'Usuário'}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-medium">
                  {user?.role || 'Administrador Geral'}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-wide text-white text-balance leading-tight">
                Bem-vindo ao Sistema Integrado{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  RN Manutenção de Frota
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Utilize o menu lateral à esquerda ou escolha um dos módulos abaixo para acessar
                orçamentos, controle de estoque, movimentações e configurações do sistema.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Access Modules */}
        <section className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Acesso rápido aos módulos
            </h2>
            <span className="text-xs text-slate-500">
              Clique em uma opção para abrir
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {sidebarStructure.map((mainTab) => (
              <div key={mainTab.id} className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {getMainTabIcon(mainTab.id)}
                  <span>{mainTab.name}</span>
                </div>

                <div className="space-y-1.5">
                  {mainTab.subTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      type="button"
                      onClick={() => onSelectTab(subTab.id)}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-amber-50/70 transition-colors group"
                    >
                      <span className="flex items-center gap-2.5 min-w-0 truncate">
                        {getSubTabIcon(subTab.id)}
                        <span className="truncate">{subTab.name}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
