import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ProfileRole, ManagedUser, SidebarMainTab } from '../types/settings';
import { supabase, getSupabaseClient } from '../lib/supabase';

// Central structure of the sidebar navigation with Abas and Sub-abas.
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
];

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'user-adm',
    name: 'Administrador Geral',
    email: 'adm@rnprecificacao.com.br',
    password: 'adm12345',
    profileId: 'perfil-admin',
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

const PROFILES_STORAGE_KEY = 'rn_precificacao_profiles_prod_v1';
const USERS_STORAGE_KEY = 'rn_precificacao_users_prod_v1';

export const ManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<ProfileRole[]>(() => {
    try {
      localStorage.removeItem('rn_precificacao_profiles_subtabs_v5');
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PROFILES;
    } catch {
      return INITIAL_PROFILES;
    }
  });

  const [users, setUsers] = useState<ManagedUser[]>(() => {
    try {
      localStorage.removeItem('rn_precificacao_users_subtabs_v5');
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed: ManagedUser[] = JSON.parse(saved).filter(
          (u: ManagedUser) => u.id !== 'user-1' && u.id !== 'user-2'
        );
        const hasAdm = parsed.some(
          (u) => u.email.toLowerCase() === 'adm@rnprecificacao.com.br'
        );
        if (!hasAdm) {
          return [INITIAL_USERS[0], ...parsed];
        }
        return parsed;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // Load from Supabase if configured
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        const client = await getSupabaseClient();
        if (!client) return;

        // Remove legacy test users and test profile if they exist in Supabase
        await client.from('managed_users').delete().in('id', ['user-1', 'user-2']);
        await client.from('profiles').delete().eq('id', 'perfil-orcamentista');

        // Ensure default admin profile and adm@rnprecificacao.com.br exist in Supabase
        await client.from('profiles').upsert(
          {
            id: 'perfil-admin',
            name: 'Administrador Geral',
            description: 'Acesso total a todas as abas e sub-abas.',
            permissions: [
              'gestao-precos-orcamentos',
              'configuracoes-perfis',
              'configuracoes-usuarios',
            ],
            is_system: true,
          },
          { onConflict: 'id' }
        );

        await client.from('managed_users').upsert(
          {
            id: 'user-adm',
            name: 'Administrador Geral',
            email: 'adm@rnprecificacao.com.br',
            password: 'adm12345',
            profile_id: 'perfil-admin',
            status: 'ativo',
          },
          { onConflict: 'id' }
        );

        // Sync any locally saved profiles that are not yet in Supabase
        let localProfiles: ProfileRole[] = [];
        try {
          const rawProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
          if (rawProfiles) localProfiles = JSON.parse(rawProfiles);
        } catch {
          localProfiles = [];
        }

        const { data: profilesData, error: profilesError } = await client
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });

        if (!profilesError && profilesData) {
          const remoteProfileIds = new Set(profilesData.map((r: any) => r.id));
          const unsyncedProfiles = localProfiles.filter(
            (p) => p.id && !remoteProfileIds.has(p.id) && p.id !== 'perfil-orcamentista'
          );

          for (const p of unsyncedProfiles) {
            await client.from('profiles').upsert({
              id: p.id,
              name: p.name,
              description: p.description || '',
              permissions: p.permissions || [],
              is_system: Boolean(p.isSystem),
              created_at: p.createdAt || new Date().toISOString(),
            });
          }

          const mappedProfiles: ProfileRole[] = profilesData.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description || '',
            permissions: Array.isArray(row.permissions) ? row.permissions : [],
            isSystem: Boolean(row.is_system),
            createdAt: row.created_at || new Date().toISOString(),
          }));
          setProfiles([...mappedProfiles, ...unsyncedProfiles]);
        }

        // Sync any locally saved users that are not yet in Supabase
        let localUsers: ManagedUser[] = [];
        try {
          const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
          if (rawUsers) localUsers = JSON.parse(rawUsers);
        } catch {
          localUsers = [];
        }

        const { data: usersData, error: usersError } = await client
          .from('managed_users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!usersError && usersData) {
          const remoteUserIds = new Set(usersData.map((r: any) => r.id));
          const remoteEmails = new Set(usersData.map((r: any) => String(r.email).toLowerCase()));
          const unsyncedUsers = localUsers.filter(
            (u) =>
              u.id &&
              !remoteUserIds.has(u.id) &&
              !remoteEmails.has(u.email.toLowerCase()) &&
              !['user-1', 'user-2'].includes(u.id)
          );

          for (const u of unsyncedUsers) {
            await client.from('managed_users').upsert({
              id: u.id,
              name: u.name,
              email: u.email,
              password: u.password || null,
              profile_id: u.profileId,
              status: u.status,
              created_at: u.createdAt || new Date().toISOString(),
            });
          }

          const mappedUsers: ManagedUser[] = usersData.map((row: any) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            password: row.password || undefined,
            profileId: row.profile_id,
            status: row.status === 'bloqueado' ? 'bloqueado' : 'ativo',
            createdAt: row.created_at || new Date().toISOString(),
          }));
          setUsers([...mappedUsers, ...unsyncedUsers]);
        }
      } catch (err) {
        console.error('Erro ao sincronizar perfis e usuários do Supabase:', err);
      }
    };

    loadSupabaseData();
  }, []);

  useEffect(() => {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const addProfile = async (name: string, description?: string) => {
    const newProfile: ProfileRole = {
      id: `perfil-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || '',
      permissions: [],
      createdAt: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, newProfile]);

    const client = supabase || (await getSupabaseClient());
    if (client) {
      const { error } = await client.from('profiles').insert({
        id: newProfile.id,
        name: newProfile.name,
        description: newProfile.description,
        permissions: newProfile.permissions,
        is_system: false,
        created_at: newProfile.createdAt,
      });
      if (error) console.error('Erro ao salvar perfil no Supabase:', error.message);
    }
  };

  const updateProfile = async (id: string, data: Partial<ProfileRole>) => {
    setProfiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...data } : item))
    );

    const client = supabase || (await getSupabaseClient());
    if (client) {
      const updatePayload: Record<string, any> = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.permissions !== undefined) updatePayload.permissions = data.permissions;

      const { error } = await client.from('profiles').update(updatePayload).eq('id', id);
      if (error) console.error('Erro ao atualizar perfil no Supabase:', error.message);
    }
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

    getSupabaseClient().then((client) => {
      if (client) {
        client
          .from('profiles')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Erro ao excluir perfil no Supabase:', error.message);
          });
      }
    });

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

        getSupabaseClient().then((client) => {
          if (client) {
            client
              .from('profiles')
              .update({ permissions: newPermissions })
              .eq('id', profileId)
              .then(({ error }) => {
                if (error) console.error('Erro ao atualizar permissões no Supabase:', error.message);
              });
          }
        });

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
      setProfiles((prev) =>
        prev.map((profile) => {
          if (profile.id !== profileId) return profile;
          const hasAccess = profile.permissions.includes(mainTabId);
          const newPermissions = hasAccess
            ? profile.permissions.filter((id) => id !== mainTabId)
            : [...profile.permissions, mainTabId];

          getSupabaseClient().then((client) => {
            if (client) {
              client
                .from('profiles')
                .update({ permissions: newPermissions })
                .eq('id', profileId)
                .then(({ error }) => {
                  if (error) console.error('Erro ao atualizar permissões no Supabase:', error.message);
                });
            }
          });

          return {
            ...profile,
            permissions: newPermissions,
          };
        })
      );
      return;
    }

    const subTabIds = mainTab.subTabs.map((s) => s.id);

    setProfiles((prev) =>
      prev.map((profile) => {
        if (profile.id !== profileId) return profile;
        const allEnabled = subTabIds.every((id) => profile.permissions.includes(id));
        const newPermissions = allEnabled
          ? profile.permissions.filter((id) => !subTabIds.includes(id))
          : Array.from(new Set([...profile.permissions, ...subTabIds]));

        getSupabaseClient().then((client) => {
          if (client) {
            client
              .from('profiles')
              .update({ permissions: newPermissions })
              .eq('id', profileId)
              .then(({ error }) => {
                if (error) console.error('Erro ao atualizar permissões no Supabase:', error.message);
              });
          }
        });

        return {
          ...profile,
          permissions: newPermissions,
        };
      })
    );
  };

  const addUser = async (userData: Omit<ManagedUser, 'id' | 'createdAt'>) => {
    const newUser: ManagedUser = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);

    const client = supabase || (await getSupabaseClient());
    if (client) {
      const { error } = await client.from('managed_users').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        password: newUser.password || null,
        profile_id: newUser.profileId,
        status: newUser.status,
        created_at: newUser.createdAt,
      });
      if (error) console.error('Erro ao salvar usuário no Supabase:', error.message);
    }
  };

  const updateUser = async (id: string, userData: Partial<ManagedUser>) => {
    setUsers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...userData } : item))
    );

    const client = supabase || (await getSupabaseClient());
    if (client) {
      const updatePayload: Record<string, any> = {};
      if (userData.name !== undefined) updatePayload.name = userData.name;
      if (userData.email !== undefined) updatePayload.email = userData.email;
      if (userData.password !== undefined) updatePayload.password = userData.password;
      if (userData.profileId !== undefined) updatePayload.profile_id = userData.profileId;
      if (userData.status !== undefined) updatePayload.status = userData.status;

      const { error } = await client.from('managed_users').update(updatePayload).eq('id', id);
      if (error) console.error('Erro ao atualizar usuário no Supabase:', error.message);
    }
  };

  const deleteUser = async (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));

    const client = supabase || (await getSupabaseClient());
    if (client) {
      const { error } = await client.from('managed_users').delete().eq('id', id);
      if (error) console.error('Erro ao excluir usuário no Supabase:', error.message);
    }
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus = item.status === 'ativo' ? 'bloqueado' : 'ativo';

        getSupabaseClient().then((client) => {
          if (client) {
            client
              .from('managed_users')
              .update({ status: nextStatus })
              .eq('id', id)
              .then(({ error }) => {
                if (error) console.error('Erro ao atualizar status no Supabase:', error.message);
              });
          }
        });

        return { ...item, status: nextStatus };
      })
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
