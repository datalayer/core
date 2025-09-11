/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export interface IDatalayerCredentials {
  runUrl: string;
  token: string;
  isAuthenticated: boolean;
}

export interface IEnvironment {
  id: string;
  name: string;
  description?: string;
  image: string;
  cpu: number;
  memory: string;
  gpu?: number;
}

export interface IRuntime {
  id: string;
  podName: string;
  environmentId: string;
  status: 'creating' | 'running' | 'stopping' | 'stopped' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface ICreateRuntimeOptions {
  environmentId: string;
  name?: string;
  cpu?: number;
  memory?: string;
  gpu?: number;
}

export interface INotebook {
  id: string;
  name: string;
  description?: string;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISpace {
  id: string;
  name: string;
  description?: string;
}

export interface IUser {
  id: string;
  username: string;
  email?: string;
  githubId?: number;
}

export interface IDatalayerApiService {
  // Authentication
  login(runUrl: string, token: string): Promise<boolean>;
  logout(): Promise<void>;
  getCredentialsWithToken(): IDatalayerCredentials | null;
  getCurrentUser(): Promise<IUser>;

  // Environments
  getEnvironments(): Promise<IEnvironment[]>;

  // Runtimes
  listUserRuntimes(): Promise<IRuntime[]>;
  createRuntime(options: ICreateRuntimeOptions): Promise<IRuntime>;
  deleteRuntime(podName: string): Promise<void>;
  getRuntimeDetails(runtimeId: string): Promise<IRuntime>;
  isRuntimeActive(podName: string): Promise<boolean>;

  // Notebooks
  listNotebooks(): Promise<INotebook[]>;
  createNotebook(
    spaceId: string,
    name: string,
    description?: string
  ): Promise<INotebook>;
  deleteNotebook(spaceId: string, itemId: string): Promise<void>;

  // Spaces
  getUserSpaces(): Promise<ISpace[]>;
  getSpaceItems(spaceId: string): Promise<any[]>;

  // Collaboration
  getCollaborationSessionId(
    documentId: string
  ): Promise<{ success: boolean; sessionId?: string; error?: string }>;

  // GitHub
  getGitHubUser(githubId: number): Promise<any>;

  // Generic requests
  makeRequest(endpoint: string, options?: RequestInit): Promise<any>;
}
