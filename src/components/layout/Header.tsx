import React from 'react';
import { LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeTab }) => {
  const { user, signOut } = useAuth();

  const getBreadcrumb = () => {
    if (activeTab === 'gestao-precos-orcamentos') {
      return (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <span className="text-slate-400">Gestão de Preços</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">Orçamentos</span>
        </div>
      );
    }
    if (activeTab === 'gestao-precos') {
      return (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <span className="text-slate-900 font-semibold">Gestão de Preços</span>
        </div>
      );
    }
    if (activeTab === 'configuracoes-perfis') {
      return (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <span className="text-slate-400">Configurações</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">Perfis</span>
        </div>
      );
    }
    if (activeTab === 'configuracoes-usuarios') {
      return (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <span className="text-slate-400">Configurações</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">Usuários</span>
        </div>
      );
    }
    return (
      <span className="text-sm font-semibold text-slate-900 tracking-tight">
        RN Precificação
      </span>
    );
  };

  return (
    <header className="h-16 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-xs">
      {/* Zone 1: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {getBreadcrumb()}
      </div>

      {/* Zone 2: Empty center */}
      <div />

      {/* Zone 3: User Profile & Logout Action */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
            {user?.fullName || 'Usuário'}
          </span>
          <span className="text-[11px] text-amber-600 font-medium">
            {user?.role || 'Administrador'}
          </span>
        </div>

        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 font-bold text-xs shadow-xs">
          {user?.fullName?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50 px-2"
          title="Sair do sistema"
          aria-label="Sair do sistema"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline ml-1 text-xs">Sair</span>
        </Button>
      </div>
    </header>
  );
};
