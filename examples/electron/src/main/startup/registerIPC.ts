/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { app, ipcMain, shell, BrowserWindow } from 'electron';
import log from 'electron-log/main';
import ConfigManager from '../config';
import DatalayerApiService from '../services/datalayer-api.service';
import WebSocketProxyService from '../services/websocket-proxy.service';

export default function registerIPC(_configManager: ConfigManager) {
  // Basic IPC handlers that don't belong to specific services

  ipcMain.on('open-external', (_, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('get-version', () => {
    return {
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      app: app.getVersion(),
    };
  });

  ipcMain.handle('get-env', () => {
    return {
      DATALAYER_RUN_URL: process.env.DATALAYER_RUN_URL || '',
      DATALAYER_TOKEN: process.env.DATALAYER_TOKEN || '',
    };
  });

  // About dialog handlers
  ipcMain.on('close-about-window', () => {
    log.debug('About window close requested');
  });

  // Legacy IPC handlers for backward compatibility with existing renderer code
  // These delegate to the new BaseService pattern

  const datalayerApiService = DatalayerApiService.getInstance();
  const webSocketProxyService = WebSocketProxyService.getInstance();

  // Datalayer API legacy handlers
  ipcMain.handle('datalayer:login', async (_, { runUrl, token }) => {
    try {
      const result = await datalayerApiService.login(runUrl, token);
      return {
        success: result,
        message: result ? 'Login successful' : 'Login failed',
      };
    } catch (error) {
      log.error('🎯 [LOGIN IPC] Login error:', error);
      return {
        success: false,
        message: (error as Error).message || 'Login failed',
      };
    }
  });

  ipcMain.handle('datalayer:logout', async () => {
    try {
      await datalayerApiService.logout();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message || 'Logout failed',
      };
    }
  });

  ipcMain.handle('datalayer:get-credentials', async () => {
    return await datalayerApiService.getCredentialsWithToken();
  });

  ipcMain.handle('datalayer:get-environments', async () => {
    try {
      const environments = await datalayerApiService.getEnvironments();
      return { success: true, data: environments };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('datalayer:create-runtime', async (_, options) => {
    log.info(
      '🎯 [IPC] Received datalayer:create-runtime request with options:',
      options
    );

    // Transform the options to match ICreateRuntimeOptions interface
    const serviceOptions = {
      environmentId: options.environment, // Transform environment -> environmentId
      name: options.name,
      // Note: credits is handled inside the service, not passed to the interface
    };

    try {
      const result = await datalayerApiService.createRuntime(serviceOptions);
      log.info('🎯 [IPC] datalayer:create-runtime result:', result);
      // Return in the same format as the original service: { success: true, data: rawApiResponse }
      return { success: true, data: result };
    } catch (error) {
      log.error('🎯 [IPC] datalayer:create-runtime error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('datalayer:delete-runtime', async (_, podName) => {
    return datalayerApiService.deleteRuntime(podName);
  });

  ipcMain.handle('datalayer:get-runtime-details', async (_, runtimeId) => {
    return datalayerApiService.getRuntimeDetails(runtimeId);
  });

  ipcMain.handle('datalayer:is-runtime-active', async (_, podName) => {
    return datalayerApiService.isRuntimeActive(podName);
  });

  ipcMain.handle('datalayer:list-user-runtimes', async () => {
    return datalayerApiService.listUserRuntimes();
  });

  ipcMain.handle('datalayer:request', async (_, { endpoint, options }) => {
    return datalayerApiService.makeRequest(endpoint, options);
  });

  ipcMain.handle('datalayer:list-notebooks', async () => {
    try {
      const notebooks = await datalayerApiService.listNotebooks();
      return { success: true, data: notebooks };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(
    'datalayer:create-notebook',
    async (_, { spaceId, name, description }) => {
      log.info(`[IPC] createNotebook handler called with:`, {
        spaceId,
        name,
        description,
      });
      try {
        const result = await datalayerApiService.createNotebook(
          spaceId,
          name,
          description
        );
        log.info(`[IPC] createNotebook result:`, result);
        return result;
      } catch (error) {
        log.error(`[IPC] createNotebook error:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    'datalayer:delete-notebook',
    async (_, { spaceId, itemId }) => {
      log.info(`[IPC] deleteNotebook handler called with:`, {
        spaceId,
        itemId,
      });
      try {
        const result = await datalayerApiService.deleteNotebook(
          spaceId,
          itemId
        );
        log.info(`[IPC] deleteNotebook result:`, result);
        return result;
      } catch (error) {
        log.error(`[IPC] deleteNotebook error:`, error);
        throw error;
      }
    }
  );

  ipcMain.handle('datalayer:get-user-spaces', async () => {
    try {
      const spaces = await datalayerApiService.getUserSpaces();
      return { success: true, spaces };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('datalayer:get-space-items', async (_, spaceId: string) => {
    return datalayerApiService.getSpaceItems(spaceId);
  });

  ipcMain.handle(
    'datalayer:get-collaboration-session',
    async (_, documentId) => {
      return datalayerApiService.getCollaborationSessionId(documentId);
    }
  );

  ipcMain.handle('datalayer:get-collaboration-token', async () => {
    const credentials = await datalayerApiService.getCredentialsWithToken();
    return credentials;
  });

  ipcMain.handle('datalayer:current-user', async () => {
    return datalayerApiService.getCurrentUser();
  });

  ipcMain.handle('datalayer:github-user', async (_, githubId: number) => {
    try {
      const userData = await datalayerApiService.getGitHubUser(githubId);
      return { success: true, data: userData };
    } catch (error) {
      log.error('🎯 [IPC] GitHub user fetch error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Failed to fetch GitHub user',
      };
    }
  });

  // HTTP Proxy IPC handlers
  ipcMain.handle(
    'proxy:http-request',
    async (_, { url, method, headers, body }) => {
      try {
        log.debug(`[HTTP Proxy] ${method} ${url}`);

        const requestOptions: RequestInit = {
          method: method || 'GET',
          headers: headers || {},
        };

        // Add body if present and method supports it
        if (body && !['GET', 'HEAD'].includes(method)) {
          if (body instanceof ArrayBuffer) {
            requestOptions.body = Buffer.from(new Uint8Array(body));
          } else if (body instanceof Uint8Array) {
            requestOptions.body = Buffer.from(body);
          } else if (typeof body === 'object') {
            requestOptions.body = JSON.stringify(body);
            requestOptions.headers = {
              ...requestOptions.headers,
              'Content-Type': 'application/json',
            };
          } else {
            requestOptions.body = body;
          }
        }

        const response = await fetch(url, requestOptions);

        // Get response headers as plain object
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Get response body
        let responseBody: unknown;
        const contentType = response.headers.get('content-type');

        if (!method || method === 'DELETE') {
          responseBody = undefined;
        } else if (contentType?.includes('application/json')) {
          responseBody = await response.json();
        } else if (contentType?.includes('text')) {
          responseBody = await response.text();
        } else {
          const buffer = await response.arrayBuffer();
          responseBody = Array.from(new Uint8Array(buffer));
        }

        return {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
        };
      } catch (error: unknown) {
        log.error('[HTTP Proxy] Request failed:', error);
        throw error;
      }
    }
  );

  // WebSocket Proxy legacy handlers
  ipcMain.handle(
    'proxy:websocket-open',
    async (_, { url, protocol, headers, runtimeId }) => {
      const mainWindow =
        BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      try {
        const result = webSocketProxyService.open(
          mainWindow,
          url,
          protocol,
          headers,
          runtimeId
        );
        return result;
      } catch (error: unknown) {
        log.error('[WebSocket Proxy] Failed to open connection:', error);
        throw error;
      }
    }
  );

  ipcMain.handle('proxy:websocket-send', async (_, { id, data }) => {
    webSocketProxyService.send(id, data);
    return { success: true };
  });

  ipcMain.handle('proxy:websocket-close', async (_, { id, code, reason }) => {
    webSocketProxyService.close(id, code, reason);
    return { success: true };
  });

  ipcMain.handle('proxy:websocket-close-runtime', async (_, { runtimeId }) => {
    webSocketProxyService.closeConnectionsForRuntime(runtimeId);
    return { success: true };
  });

  // Runtime termination notification handler
  ipcMain.handle('runtime-terminated', async (_, { runtimeId }) => {
    // Initialize global cleanup registry in main process
    if (!(global as any).__datalayerRuntimeCleanup) {
      (global as any).__datalayerRuntimeCleanup = new Map();
    }

    const cleanupRegistry = (global as any).__datalayerRuntimeCleanup;
    cleanupRegistry.set(runtimeId, { terminated: true });

    log.debug(
      `[Runtime Cleanup] 🛑 Main process marked runtime ${runtimeId} as terminated`
    );

    return { success: true };
  });

  log.debug('Generic IPC handlers registered');
}
