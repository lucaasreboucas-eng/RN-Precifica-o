import React, { useState } from 'react';
import {
  Settings,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  BadgeDollarSign,
  FileText,
} from 'lucide-react';
import { Logo } from '../brand/Logo';
import { useManagement } from '../../context/ManagementContext';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const getTabIcon = (tabId: string) => {
  switch (tabId) {
    case 'gestao-precos':
      return <BadgeDollarSign className="w-4 h-4 shrink-0" />;
    case 'gestao-precos-orcamentos':
      return <FileText className="w-3.5 h-3.5 shrink-0" />;
    case 'configuracoes':
      return <Settings className="w-4 h-4 shrink-0" />;
    case 'configuracoes-perfis':
      return <Shield className="w-3.5 h-3.5 shrink-0" />;
    case 'configuracoes-usuarios':
      return <Users className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Settings className="w-3.5 h-3.5 shrink-0" />;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { sidebarStructure } = useManagement();

  // Track open/collapsed state for each main tab
  const [openTabs, setOpenTabs] = useState<Record<string, boolean>>({
    configuracoes: false,
    'gestao-precos': false,
  });

  const toggleOpen = (tabId: string) => {
    setOpenTabs((prev) => ({ ...prev, [tabId]: !prev[tabId] }));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#091120] border-r border-slate-800/80 z-40 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header & Retract button on top */}
        <div
          className={`h-20 px-3.5 flex items-center ${
            isCollapsed ? 'justify-between' : 'justify-between'
          } border-b border-slate-800/70`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Logo size="sm" orientation="horizontal" showText={!isCollapsed} />
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop retract button in header */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                title={isCollapsed ? 'Expandir barra lateral' : 'Retrair barra lateral'}
                aria-label={isCollapsed ? 'Expandir barra lateral' : 'Retrair barra lateral'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-amber-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />
                )}
              </button>
            )}

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation area */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {sidebarStructure.map((mainTab) => {
            const hasSubTabs = mainTab.subTabs && mainTab.subTabs.length > 0;
            const isMainOpen = openTabs[mainTab.id] ?? true;
            const isDirectActive = activeTab === mainTab.id;
            const isAnySubActive = hasSubTabs && mainTab.subTabs.some((s) => s.id === activeTab);
            const isHighlighted = isDirectActive || isAnySubActive;

            return (
              <div key={mainTab.id}>
                {/* Aba Principal */}
                <button
                  onClick={() => {
                    if (!hasSubTabs) {
                      onSelectTab(mainTab.id);
                      if (window.innerWidth < 1024) onClose();
                    } else {
                      if (isCollapsed && onToggleCollapse) {
                        onToggleCollapse();
                      } else {
                        toggleOpen(mainTab.id);
                      }
                    }
                  }}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                  } rounded-xl text-sm font-medium transition-all ${
                    isHighlighted
                      ? 'bg-slate-800/60 text-amber-300 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  } ${!hasSubTabs && isDirectActive && !isCollapsed ? 'border-l-2 border-amber-400 bg-amber-400/10' : ''}`}
                  title={isCollapsed ? mainTab.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className={isHighlighted ? 'text-amber-400' : 'text-slate-400'}>
                      {getTabIcon(mainTab.id)}
                    </span>
                    {!isCollapsed && <span>{mainTab.name}</span>}
                  </div>

                  {!isCollapsed && hasSubTabs && (
                    isMainOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )
                  )}
                </button>

                {/* Sub-abas (se houver) */}
                {hasSubTabs && (!isCollapsed ? isMainOpen : true) && (
                  <div
                    className={
                      isCollapsed
                        ? 'mt-2 space-y-1 flex flex-col items-center'
                        : 'pl-4 mt-1.5 space-y-1 border-l border-slate-800/80 ml-4'
                    }
                  >
                    {mainTab.subTabs.map((subTab) => {
                      const isActive = activeTab === subTab.id;

                      return (
                        <button
                          key={subTab.id}
                          onClick={() => {
                            onSelectTab(subTab.id);
                            if (window.innerWidth < 1024) onClose();
                          }}
                          className={`flex items-center ${
                            isCollapsed
                              ? 'justify-center w-10 h-10 rounded-xl'
                              : 'w-full gap-2.5 px-3 py-2 rounded-lg'
                          } text-xs font-medium transition-all ${
                            isActive
                              ? isCollapsed
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                : 'bg-amber-400/15 text-amber-300 font-semibold border-l-2 border-amber-400'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                          }`}
                          title={subTab.name}
                        >
                          <span className={isActive ? 'text-amber-400' : 'text-slate-500'}>
                            {getTabIcon(subTab.id)}
                          </span>
                          {!isCollapsed && <span>{subTab.name}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};
