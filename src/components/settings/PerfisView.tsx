import React, { useState } from 'react';
import {
  Shield,
  Users,
  Settings,
  BadgeDollarSign,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { useManagement } from '../../context/ManagementContext';
import type { ProfileRole } from '../../types/settings';

// Icon mapping matching exactly the Sidebar
const getTabIcon = (tabId: string) => {
  switch (tabId) {
    case 'gestao-precos':
      return <BadgeDollarSign className="w-4 h-4 text-amber-600" />;
    case 'gestao-precos-orcamentos':
      return <FileText className="w-3.5 h-3.5" />;
    case 'configuracoes':
      return <Settings className="w-4 h-4 text-slate-600" />;
    case 'configuracoes-perfis':
      return <Shield className="w-3.5 h-3.5" />;
    case 'configuracoes-usuarios':
      return <Users className="w-3.5 h-3.5" />;
    default:
      return <Settings className="w-3.5 h-3.5" />;
  }
};

export const PerfisView: React.FC = () => {
  const {
    profiles,
    sidebarStructure,
    addProfile,
    updateProfile,
    deleteProfile,
    toggleSubTabAccess,
    toggleMainTabAccess,
  } = useManagement();

  // Create modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [createError, setCreateError] = useState('');

  // Edit modal
  const [editingProfile, setEditingProfile] = useState<ProfileRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');

  // Delete modal
  const [profileToDelete, setProfileToDelete] = useState<ProfileRole | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newProfileName.trim()) {
      setCreateError('Informe o nome do perfil.');
      return;
    }

    addProfile(newProfileName.trim());
    setNewProfileName('');
    setIsCreateModalOpen(false);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editName.trim()) {
      setEditError('Informe o nome do perfil.');
      return;
    }

    if (editingProfile) {
      updateProfile(editingProfile.id, { name: editName.trim() });
      setEditingProfile(null);
    }
  };

  const handleDeleteProfile = () => {
    if (!profileToDelete) return;
    const result = deleteProfile(profileToDelete.id);
    if (!result.success) {
      setDeleteError(result.error || 'Não foi possível excluir este perfil.');
    } else {
      setProfileToDelete(null);
      setDeleteError('');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Perfis de Acesso
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Controle de acesso por abas e sub-abas da barra lateral.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setNewProfileName('');
            setCreateError('');
            setIsCreateModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo Perfil
        </Button>
      </div>

      {deleteError && (
        <Alert type="error" onClose={() => setDeleteError('')}>
          {deleteError}
        </Alert>
      )}

      {/* Grid de Cards dos Perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => {
          return (
            <Card
              key={profile.id}
              variant="glass"
              className="hover:border-amber-400/50 transition-all flex flex-col justify-between"
            >
              {/* Topo do Card: Nome do Perfil e Ações */}
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate text-slate-900">
                        {profile.name}
                      </CardTitle>
                      {profile.isSystem && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                          Padrão do Sistema
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingProfile(profile);
                        setEditName(profile.name);
                        setEditError('');
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Editar nome do perfil"
                      aria-label="Editar nome"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {!profile.isSystem && (
                      <button
                        onClick={() => {
                          setDeleteError('');
                          setProfileToDelete(profile);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir perfil"
                        aria-label="Excluir perfil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Corpo do Card: Abas e Sub-abas idênticas à Barra Lateral */}
              <CardContent className="pt-4 space-y-4">
                {sidebarStructure.map((mainTab) => {
                  const hasSubTabs = mainTab.subTabs && mainTab.subTabs.length > 0;
                  const isMainTabEnabled = profile.permissions.includes(mainTab.id);
                  const allSubTabsEnabled =
                    hasSubTabs && mainTab.subTabs.every((s) => profile.permissions.includes(s.id));

                  return (
                    <div
                      key={mainTab.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5"
                    >
                      {/* Aba Principal */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTabIcon(mainTab.id)}
                          <span className="text-xs sm:text-sm font-semibold text-slate-800">
                            {mainTab.name}
                          </span>
                        </div>

                        {!hasSubTabs ? (
                          /* Botão direto Liberado / Bloqueado para abas sem sub-abas */
                          <button
                            type="button"
                            onClick={() => toggleMainTabAccess(profile.id, mainTab.id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                              isMainTabEnabled
                                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-xs'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title={
                              isMainTabEnabled
                                ? `Clique para bloquear aba ${mainTab.name}`
                                : `Clique para liberar aba ${mainTab.name}`
                            }
                          >
                            {isMainTabEnabled ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Liberado</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                <span>Bloqueado</span>
                              </>
                            )}
                          </button>
                        ) : (
                          /* Botão rápido para alternar todas as sub-abas */
                          <button
                            type="button"
                            onClick={() => toggleMainTabAccess(profile.id, mainTab.id)}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                              allSubTabsEnabled
                                ? 'text-amber-700 hover:text-amber-800'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {allSubTabsEnabled ? 'Desmarcar todas' : 'Liberar todas'}
                          </button>
                        )}
                      </div>

                      {/* Sub-abas da Barra Lateral (se houver) */}
                      {hasSubTabs && (
                        <div className="pl-3.5 space-y-1.5 border-l border-slate-200 ml-2">
                          {mainTab.subTabs.map((subTab) => {
                            const hasAccess = profile.permissions.includes(subTab.id);

                            return (
                              <div
                                key={subTab.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                  hasAccess
                                    ? 'bg-amber-50/70 border-amber-200 text-slate-900'
                                    : 'bg-white border-slate-200 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className={hasAccess ? 'text-amber-600' : 'text-slate-400'}>
                                    {getTabIcon(subTab.id)}
                                  </span>
                                  <span className="text-xs font-medium truncate">
                                    {subTab.name}
                                  </span>
                                </div>

                                {/* Botão Liberado / Bloqueado */}
                                <button
                                  type="button"
                                  onClick={() => toggleSubTabAccess(profile.id, subTab.id)}
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                                    hasAccess
                                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-xs'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                  title={
                                    hasAccess
                                      ? `Clique para bloquear sub-aba ${subTab.name}`
                                      : `Clique para liberar sub-aba ${subTab.name}`
                                  }
                                >
                                  {hasAccess ? (
                                    <>
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>Liberado</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3 h-3" />
                                      <span>Bloqueado</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Criar Perfil */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Criar Novo Perfil"
        description="Defina o nome do perfil de acesso."
        maxWidth="sm"
      >
        <form onSubmit={handleCreateProfile} className="space-y-4">
          {createError && (
            <Alert type="error" onClose={() => setCreateError('')}>
              {createError}
            </Alert>
          )}

          <Input
            label="Nome do Perfil"
            placeholder="Ex: Orçamentista, Financeiro, Auditor"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Criar Perfil
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Nome do Perfil */}
      <Modal
        isOpen={Boolean(editingProfile)}
        onClose={() => setEditingProfile(null)}
        title="Editar Nome do Perfil"
        description="Altere a identificação deste perfil de acesso."
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {editError && (
            <Alert type="error" onClose={() => setEditError('')}>
              {editError}
            </Alert>
          )}

          <Input
            label="Nome do Perfil"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProfile(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Excluir Perfil */}
      <Modal
        isOpen={Boolean(profileToDelete)}
        onClose={() => setProfileToDelete(null)}
        title="Excluir Perfil"
        description="Confirmar a exclusão do perfil de acesso."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Tem certeza que deseja excluir o perfil <strong className="text-slate-900">"{profileToDelete?.name}"</strong>?
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setProfileToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteProfile}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
