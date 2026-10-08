import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  Mail,
  Lock,
  User,
  Shield,
  KeyRound,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { useManagement } from '../../context/ManagementContext';
import type { ManagedUser } from '../../types/settings';

export const UsuariosView: React.FC = () => {
  const { users, profiles, addUser, updateUser, deleteUser, toggleUserStatus } = useManagement();

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'bloqueado'>('todos');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileId, setProfileId] = useState('');
  const [formError, setFormError] = useState('');

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setProfileId(profiles[0]?.id || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setProfileId(user.profileId);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Informe o nome do colaborador.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Informe um e-mail válido.');
      return;
    }

    if (!editingUser && !password.trim()) {
      setFormError('Defina uma senha de acesso inicial para o novo usuário.');
      return;
    }

    if (!profileId) {
      setFormError('Selecione um perfil de acesso.');
      return;
    }

    // Check duplicate email
    const emailExists = users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== editingUser?.id
    );

    if (emailExists) {
      setFormError('Já existe um usuário cadastrado com este e-mail.');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        name: name.trim(),
        email: email.trim(),
        profileId,
      });
    } else {
      addUser({
        name: name.trim(),
        email: email.trim(),
        profileId,
        status: 'ativo',
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteUser(userToDelete.id);
    setUserToDelete(null);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestão de Usuários
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cadastre credenciais, qualifique perfis de acesso e controle o status de cada colaborador.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Novo Usuário
        </Button>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          {(['todos', 'ativo', 'bloqueado'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                statusFilter === filter
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'todos' ? 'Todos' : filter === 'ativo' ? 'Ativos' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table / List */}
      <Card variant="glass" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Colaborador / E-mail</th>
                <th className="px-5 py-3.5">Perfil / Qualificação</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-xs">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => {
                  const assignedProfile = profiles.find((p) => p.id === userItem.profileId);
                  const isBlocked = userItem.status === 'bloqueado';

                  return (
                    <tr
                      key={userItem.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBlocked ? 'opacity-70 bg-red-50/30' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                            {userItem.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>{userItem.name}</span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{userItem.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800">
                          <Shield className="w-3 h-3 text-amber-600" />
                          <span>{assignedProfile?.name || 'Não atribuído'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                            isBlocked
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isBlocked ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'
                            }`}
                          />
                          {isBlocked ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Bloquear / Desbloquear */}
                          <button
                            onClick={() => toggleUserStatus(userItem.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isBlocked
                                ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                            title={isBlocked ? 'Desbloquear acesso' : 'Bloquear acesso'}
                            aria-label={isBlocked ? 'Desbloquear acesso' : 'Bloquear acesso'}
                          >
                            {isBlocked ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditModal(userItem)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Editar usuário"
                            aria-label="Editar usuário"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => setUserToDelete(userItem)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir usuário"
                            aria-label="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Criar/Editar Usuário */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        description={
          editingUser
            ? 'Atualize os dados cadastrais e o perfil de acesso do colaborador.'
            : 'Preencha as informações para habilitar as credenciais do novo usuário.'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmitUser} className="space-y-4">
          {formError && (
            <Alert type="error" onClose={() => setFormError('')}>
              {formError}
            </Alert>
          )}

          <Input
            label="Nome Completo"
            placeholder="Ex: João da Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
            autoFocus
          />

          <Input
            label="E-mail Corporativo"
            type="email"
            placeholder="joao@rnprecificacao.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <div>
            <Label htmlFor="user-profile" required>
              Perfil de Acesso
            </Label>
            <div className="relative">
              <Shield className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                id="user-profile"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="w-full h-11 pl-11 pr-3 bg-white text-slate-900 rounded-lg border border-slate-300 text-sm focus:border-amber-500 focus:outline-none shadow-xs"
                required
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isSystem ? '(Padrão)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Input
              label={editingUser ? 'Nova Senha (Opcional)' : 'Senha de Acesso Inicial'}
              type="password"
              placeholder={editingUser ? 'Deixe em branco para manter a atual' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required={!editingUser}
            />
            {editingUser && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                Preencha apenas se desejar redefinir a senha do usuário.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title="Excluir Usuário"
        description="Esta ação removerá permanentemente o acesso do colaborador."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Deseja realmente excluir o acesso de{' '}
            <strong className="text-slate-900">{userToDelete?.name}</strong> (
            <span className="font-mono text-slate-700">{userToDelete?.email}</span>)?
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setUserToDelete(null)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteUser}>
              Confirmar Exclusão
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
