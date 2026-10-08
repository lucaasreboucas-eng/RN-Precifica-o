import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  isComingSoon?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}
