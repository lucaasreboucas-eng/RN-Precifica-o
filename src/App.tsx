import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ManagementProvider } from './context/ManagementContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageLoader } from './components/ui/Spinner';
import { PerfisView } from './components/settings/PerfisView';
import { UsuariosView } from './components/settings/UsuariosView';
import { GestaoPrecosView } from './components/pricing/GestaoPrecosView';
import { OrcamentosView } from './components/pricing/OrcamentosView';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('gestao-precos-orcamentos');

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
      {activeTab === 'gestao-precos-orcamentos' && <OrcamentosView />}
      {activeTab === 'gestao-precos' && <GestaoPrecosView />}
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
