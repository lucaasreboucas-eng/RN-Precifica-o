import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ProfileRole, ManagedUser, SidebarMainTab } from '../types/settings';

// Central structure of the sidebar navigation with Abas and Sub-abas.
// As new main tabs and sub-tabs are developed, add them here so they automatically appear in both the sidebar and the profile cards.
export const SIDEBAR_STRUCTURE: SidebarMainTab[] = [
  {
    id: 'configuracoes',
    name: 'Configurações',
    subTabs: [
      {
        id: 'configuracoes-perfis',
        name: 'Perfis',
      },
      {
        id: 'configuracoes-usuarios',
        name: 'Usuários',
      },
    ],
  },
  {
    id: 'gestao-precos',
    name: 'Gestão de Preços',
    subTabs: [
      {
        id: 'gestao-precos-orcamentos',
        name: 'Orçamentos',
      },
    ],
  },
];

const INITIAL_PROFILES: ProfileRole[] = [
  {
    id: 'perfil-admin',
    name: 'Administrador Geral',
    description: 'Acesso total a todas as abas e sub-abas.',
    permissions: [
      'gestao-precos-orcamentos',
      'configuracoes-perfis',
      'configuracoes-usuarios',
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'perfil-orcamentista',
    name: 'Orçamentista',
    description: 'Acesso restrito.',
    permissions: ['gestao-precos-orcamentos', 'configuracoes-perfis'],
    isSystem: false,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'user-1',
    name: 'Lucas Rebouças',
    email: 'lucas@rnprecificacao.com.br',
    profileId: 'perfil-admin',
    status: 'ativo',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    name: 'Carlos Alberto Mendes',
    email: 'carlos.mendes@rnprecificacao.com.br',
    profileId: 'perfil-orcamentista',
    status: 'ativo',
    createdAt: new Date().toISOString(),
  },
];

interface ManagementContextType {
  profiles: ProfileRole[];
  users: ManagedUser[];
  sidebarStructure: SidebarMainTab[];
  addProfile: (name: string, description?: string) => void;
  updateProfile: (id: string, data: Partial<ProfileRole>) => void;
  deleteProfile: (id: string) => { success: boolean; error?: string };
  toggleSubTabAccess: (profileId: string, subTabId: string) => void;
  toggleMainTabAccess: (profileId: string, mainTabId: string) => void;
  addUser: (user: Omit<ManagedUser, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, user: Partial<ManagedUser>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
}

const ManagementContext = createContext<ManagementContextType | undefined>(undefined);

const PROFILES_STORAGE_KEY = 'rn_precificacao_profiles_subtabs_v5';
const USERS_STORAGE_KEY = 'rn_precificacao_users_subtabs_v5';

export const ManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<ProfileRole[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PROFILES;
    } catch {
      return INITIAL_PROFILES;
    }
  });

  const [users, setUsers] = useState<ManagedUser[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  useEffect(() => {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const addProfile = (name: string, description?: string) => {
    const newProfile: ProfileRole = {
      id: `perfil-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      permissions: [],
      createdAt: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, newProfile]);
  };

  const updateProfile = (id: string, data: Partial<ProfileRole>) => {
    setProfiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...data } : item))
    );
  };

  const deleteProfile = (id: string) => {
    const isUsed = users.some((u) => u.profileId === id);
    if (isUsed) {
      return {
        success: false,
        error: 'Este perfil possui colaboradores vinculados e não pode ser excluído.',
      };
    }
    const target = profiles.find((p) => p.id === id);
    if (target?.isSystem) {
      return {
        success: false,
        error: 'O perfil padrão de Administrador não pode ser removido.',
      };
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    return { success: true };
  };

  const toggleSubTabAccess = (profileId: string, subTabId: string) => {
    setProfiles((prev) =>
      prev.map((profile) => {
        if (profile.id !== profileId) return profile;
        const hasAccess = profile.permissions.includes(subTabId);
        const newPermissions = hasAccess
          ? profile.permissions.filter((id) => id !== subTabId)
          : [...profile.permissions, subTabId];
        return {
          ...profile,
          permissions: newPermissions,
        };
      })
    );
  };

  const toggleMainTabAccess = (profileId: string, mainTabId: string) => {
    const mainTab = SIDEBAR_STRUCTURE.find((m) => m.id === mainTabId);
    if (!mainTab) return;

    if (mainTab.subTabs.length === 0) {
      // Toggle direct access to main tab
      setProfiles((prev) =>
        prev.map((profile) => {
          if (profile.id !== profileId) return profile;
          const hasAccess = profile.permissions.includes(mainTabId);
          return {
            ...profile,
            permissions: hasAccess
              ? profile.permissions.filter((id) => id !== mainTabId)
              : [...profile.permissions, mainTabId],
          };
        })
      );
      return;
    }

    const subTabIds = mainTab.subTabs.map((s) => s.id);

    setProfiles((prev) =>
      prev.map((profile) => {
        if (profile.id !== profileId) return profile;
        // If all sub-tabs are enabled, disable all; otherwise enable all
        const allEnabled = subTabIds.every((id) => profile.permissions.includes(id));
        const newPermissions = allEnabled
          ? profile.permissions.filter((id) => !subTabIds.includes(id))
          : Array.from(new Set([...profile.permissions, ...subTabIds]));

        return {
          ...profile,
          permissions: newPermissions,
        };
      })
    );
  };

  const addUser = (userData: Omit<ManagedUser, 'id' | 'createdAt'>) => {
    const newUser: ManagedUser = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, userData: Partial<ManagedUser>) => {
    setUsers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...userData } : item))
    );
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'ativo' ? 'bloqueado' : 'ativo' }
          : item
      )
    );
  };

  return (
    <ManagementContext.Provider
      value={{
        profiles,
        users,
        sidebarStructure: SIDEBAR_STRUCTURE,
        addProfile,
        updateProfile,
        deleteProfile,
        toggleSubTabAccess,
        toggleMainTabAccess,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
      }}
    >
      {children}
    </ManagementContext.Provider>
  );
};

export const useManagement = () => {
  const context = useContext(ManagementContext);
  if (!context) {
    throw new Error('useManagement deve ser utilizado dentro de ManagementProvider');
  }
  return context;
};
