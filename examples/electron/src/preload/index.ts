import { contextBridge, ipcRenderer } from 'electron';

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

  // Generic request handler
  request: (
    endpoint: string,
    options?: { method?: string; body?: any; headers?: Record<string, string> }
  ) => ipcRenderer.invoke('datalayer:request', { endpoint, options }),

  // Notebooks
  listNotebooks: () => ipcRenderer.invoke('datalayer:list-notebooks'),
});

// Type definitions for TypeScript
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
    data?: any[];
    error?: string;
  }>;
  createRuntime: (options: {
    environment: string;
    name?: string;
    credits?: number;
  }) => Promise<{ success: boolean; data?: any; error?: string }>;
  request: (
    endpoint: string,
    options?: { method?: string; body?: any; headers?: Record<string, string> }
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  listNotebooks: () => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    datalayerAPI: DatalayerAPI;
  }
}
