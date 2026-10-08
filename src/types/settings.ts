export interface SidebarSubTab {
  id: string;
  name: string;
}

export interface SidebarMainTab {
  id: string;
  name: string;
  subTabs: SidebarSubTab[];
}

export interface ProfileRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // List of permitted sub-tab IDs or tab IDs
  isSystem?: boolean;
  createdAt: string;
}

export type UserStatus = 'ativo' | 'bloqueado';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  profileId: string;
  status: UserStatus;
  createdAt: string;
}
