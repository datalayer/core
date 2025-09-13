/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export type ViewType = 'notebooks' | 'notebook' | 'document' | 'environments';

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  id: number;
  email?: string;
  url?: string;
}

export interface LoadingScreenProps {
  isCheckingAuth: boolean;
  isReconnecting: boolean;
}

export interface NavigationTabProps {
  label: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
  onClick: () => void;
  'aria-label'?: string;
}

export interface NavigationTabsProps {
  currentView: ViewType;
  isNotebookEditorActive: boolean;
  isDocumentEditorActive: boolean;
  onViewChange: (view: ViewType) => void;
}

export interface UserMenuProps {
  githubUser: GitHubUser;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

export interface AppHeaderProps {
  currentView: ViewType;
  isNotebookEditorActive: boolean;
  isDocumentEditorActive: boolean;
  isAuthenticated: boolean;
  githubUser: GitHubUser | null;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
}

export interface AppLayoutProps {
  children: React.ReactNode;
}
