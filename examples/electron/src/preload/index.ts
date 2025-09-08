/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { contextBridge, ipcRenderer } from 'electron';
// import log from 'electron-log/renderer'; // Uncomment when needed for logging

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Get environment variables
  getEnv: () => ipcRenderer.invoke('get-env'),

  // Listen for menu actions
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_, action) => callback(action));
  },

  // Remove menu action listener
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners('menu-action');
  },

  // Platform info
  platform: process.platform,

  // About dialog methods
  closeAboutWindow: () => ipcRenderer.send('close-about-window'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
});

// Expose proxy APIs for ServiceManager
contextBridge.exposeInMainWorld('proxyAPI', {
  // HTTP proxy
  httpRequest: (options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) => ipcRenderer.invoke('proxy:http-request', options),

  // WebSocket proxy
  websocketOpen: (options: {
    url: string;
    protocol?: string;
    headers?: Record<string, string>;
  }) => ipcRenderer.invoke('proxy:websocket-open', options),

  websocketSend: (options: { id: string; data: unknown }) =>
    ipcRenderer.invoke('proxy:websocket-send', options),

  websocketClose: (options: { id: string; code?: number; reason?: string }) =>
    ipcRenderer.invoke('proxy:websocket-close', options),
  websocketCloseAll: () => ipcRenderer.invoke('proxy:websocket-close-all'),

  // Listen for WebSocket events
  onWebSocketEvent: (
    callback: (event: {
      id: string;
      type: 'open' | 'message' | 'close' | 'error';
      data?: unknown;
      code?: number;
      reason?: string;
      error?: string;
    }) => void
  ) => {
    ipcRenderer.on('websocket-event', (_, event) => callback(event));
  },

  // Remove WebSocket event listener
  removeWebSocketEventListener: () => {
    ipcRenderer.removeAllListeners('websocket-event');
  },
});

// Expose Datalayer API methods
contextBridge.exposeInMainWorld('datalayerAPI', {
  // Authentication
  login: (credentials: { runUrl: string; token: string }) =>
    ipcRenderer.invoke('datalayer:login', credentials),

  logout: () => ipcRenderer.invoke('datalayer:logout'),

  getCredentials: () => ipcRenderer.invoke('datalayer:get-credentials'),

  // API calls
  getEnvironments: () => ipcRenderer.invoke('datalayer:get-environments'),

  createRuntime: (options: {
    environment: string;
    name?: string;
    credits?: number;
  }) => ipcRenderer.invoke('datalayer:create-runtime', options),

  deleteRuntime: (runtimeId: string) =>
    ipcRenderer.invoke('datalayer:delete-runtime', runtimeId),

  getRuntimeDetails: (runtimeId: string) =>
    ipcRenderer.invoke('datalayer:get-runtime-details', runtimeId),

  isRuntimeActive: (podName: string) =>
    ipcRenderer.invoke('datalayer:is-runtime-active', podName),

  listUserRuntimes: () => ipcRenderer.invoke('datalayer:list-user-runtimes'),

  // Generic request handler
  request: (
    endpoint: string,
    options?: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ) => ipcRenderer.invoke('datalayer:request', { endpoint, options }),

  // Notebooks
  listNotebooks: () => ipcRenderer.invoke('datalayer:list-notebooks'),

  createNotebook: (spaceId: string, name: string, description?: string) =>
    ipcRenderer.invoke('datalayer:create-notebook', {
      spaceId,
      name,
      description,
    }),

  deleteNotebook: (spaceId: string, itemId: string) =>
    ipcRenderer.invoke('datalayer:delete-notebook', {
      spaceId,
      itemId,
    }),

  getUserSpaces: () => ipcRenderer.invoke('datalayer:get-user-spaces'),

  // Collaboration
  getCollaborationSession: (documentId: string) =>
    ipcRenderer.invoke('datalayer:get-collaboration-session', documentId),

  getCollaborationToken: () =>
    ipcRenderer.invoke('datalayer:get-collaboration-token'),

  // User and GitHub API
  getCurrentUser: () => ipcRenderer.invoke('datalayer:current-user'),

  getGitHubUser: (githubId: number) =>
    ipcRenderer.invoke('datalayer:github-user', githubId),
});

// Type definitions for TypeScript
export interface ProxyAPI {
  httpRequest: (options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) => Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
  }>;
  websocketOpen: (options: {
    url: string;
    protocol?: string;
    headers?: Record<string, string>;
  }) => Promise<{ id: string }>;
  websocketSend: (options: {
    id: string;
    data: unknown;
  }) => Promise<{ success: boolean }>;
  websocketClose: (options: {
    id: string;
    code?: number;
    reason?: string;
  }) => Promise<{ success: boolean }>;
  websocketCloseAll: () => Promise<{ success: boolean }>;
  onWebSocketEvent: (
    callback: (event: {
      id: string;
      type: 'open' | 'message' | 'close' | 'error';
      data?: unknown;
      code?: number;
      reason?: string;
      error?: string;
    }) => void
  ) => void;
  removeWebSocketEventListener: () => void;
}

export interface ElectronAPI {
  getVersion: () => Promise<{
    electron: string;
    node: string;
    chrome: string;
    app: string;
  }>;
  getEnv: () => Promise<{
    DATALAYER_RUN_URL: string;
    DATALAYER_TOKEN: string;
  }>;
  onMenuAction: (callback: (action: string) => void) => void;
  removeMenuActionListener: () => void;
  platform: NodeJS.Platform;
  closeAboutWindow: () => void;
  openExternal: (url: string) => void;
}

// API response data types
export interface EnvironmentData {
  name: string;
  display_name?: string;
  title?: string;
  description?: string;
  image?: string;
  tags?: string[];
  language?: string;
  framework?: string;
  is_gpu?: boolean;
  is_default?: boolean;
  resources?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RuntimeData {
  uid: string;
  given_name?: string;
  pod_name: string;
  ingress?: string;
  token?: string;
  environment_name?: string;
  environment_title?: string;
  type?: string;
  burning_rate?: number;
  reservation_id?: string;
  started_at?: string;
  expired_at?: string;
  status?: string;
  [key: string]: unknown;
}

export interface NotebookData {
  uid?: string;
  id?: string;
  name?: string;
  path?: string;
  [key: string]: unknown;
}

export interface SpaceData {
  uid?: string;
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface DatalayerAPI {
  login: (credentials: {
    runUrl: string;
    token: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean }>;
  getCredentials: () => Promise<{ runUrl: string; isAuthenticated: boolean }>;
  getEnvironments: () => Promise<{
    success: boolean;
    data?: EnvironmentData[];
    error?: string;
  }>;
  createRuntime: (options: {
    environment: string;
    name?: string;
    credits?: number;
  }) => Promise<{
    success: boolean;
    data?: { runtime?: RuntimeData };
    error?: string;
  }>;
  deleteRuntime: (
    podName: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  getRuntimeDetails: (
    runtimeId: string
  ) => Promise<{ success: boolean; data?: RuntimeData; error?: string }>;
  isRuntimeActive: (podName: string) => Promise<{
    success: boolean;
    isActive: boolean;
    runtime?: RuntimeData;
    error?: string;
  }>;
  listUserRuntimes: () => Promise<{
    success: boolean;
    data?: RuntimeData[];
    error?: string;
  }>;
  request: (
    endpoint: string,
    options?: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ) => Promise<{
    success: boolean;
    data?: { sessionId?: string; [key: string]: unknown };
    error?: string;
  }>;
  listNotebooks: () => Promise<{
    success: boolean;
    data?: NotebookData[];
    error?: string;
  }>;
  createNotebook: (
    spaceId: string,
    name: string,
    description?: string
  ) => Promise<{
    success: boolean;
    data?: NotebookData;
    error?: string;
  }>;
  deleteNotebook: (
    spaceId: string,
    itemId: string
  ) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  getUserSpaces: () => Promise<{
    success: boolean;
    data?: SpaceData[];
    error?: string;
  }>;
  getCollaborationSession: (documentId: string) => Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }>;
  getCollaborationToken: () => Promise<{
    runUrl: string;
    token?: string;
    isAuthenticated: boolean;
  }>;
  getCurrentUser: () => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
  getGitHubUser: (githubId: number) => Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    datalayerAPI: DatalayerAPI;
    proxyAPI: ProxyAPI;
  }
}
