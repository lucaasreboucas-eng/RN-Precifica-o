import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ManagementProvider } from './context/ManagementContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageLoader } from './components/ui/Spinner';
import { WelcomeView } from './components/home/WelcomeView';
import { PerfisView } from './components/settings/PerfisView';
import { UsuariosView } from './components/settings/UsuariosView';
import { GestaoPrecosView } from './components/pricing/GestaoPrecosView';
import { OrcamentosView } from './components/pricing/OrcamentosView';
import { CadastroProdutosView } from './components/inventory/CadastroProdutosView';
import { MovimentacoesView } from './components/inventory/MovimentacoesView';
import { RelatoriosView } from './components/inventory/RelatoriosView';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('inicio');

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTab('inicio');
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <FullPageLoader message="Carregando..." />;
  }

  // Unauthenticated view: Login Screen
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated workspace
  return (
    <AppLayout activeTab={activeTab} onSelectTab={(tabId) => setActiveTab(tabId)}>
      {activeTab === 'inicio' && <WelcomeView onSelectTab={(tabId) => setActiveTab(tabId)} />}
      {activeTab === 'gestao-precos-orcamentos' && <OrcamentosView />}
      {activeTab === 'gestao-precos' && <GestaoPrecosView />}
      {activeTab === 'gestao-estoque-produtos' && <CadastroProdutosView />}
      {activeTab === 'gestao-estoque-movimentacoes' && <MovimentacoesView />}
      {activeTab === 'gestao-estoque-relatorios' && <RelatoriosView />}
      {activeTab === 'configuracoes-perfis' && <PerfisView />}
      {activeTab === 'configuracoes-usuarios' && <UsuariosView />}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ManagementProvider>
        <AppContent />
      </ManagementProvider>
    </AuthProvider>
  );
}
