/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Initialize electron-log FIRST, before any other imports
import log from 'electron-log/main';

// Configure electron-log for main process immediately
log.initialize();
log.transports.file.level = 'info';
// Disable console transport in production to avoid EPIPE errors
log.transports.console.level =
  process.env.NODE_ENV === 'development' ? 'debug' : false;

// Override console.log to use electron-log to prevent EPIPE errors
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args: any[]) => {
  try {
    log.info(...args);
  } catch (e: any) {
    // Silently ignore EPIPE errors
    if (e?.code !== 'EPIPE') {
      originalConsoleLog('Log error:', e);
    }
  }
};

console.error = (...args: any[]) => {
  try {
    log.error(...args);
  } catch (e: any) {
    // Silently ignore EPIPE errors
    if (e?.code !== 'EPIPE') {
      originalConsoleError('Log error:', e);
    }
  }
};

console.warn = (...args: any[]) => {
  try {
    log.warn(...args);
  } catch (e: any) {
    // Silently ignore EPIPE errors
    if (e?.code !== 'EPIPE') {
      originalConsoleWarn('Log error:', e);
    }
  }
};

import { app, BrowserWindow, Menu, ipcMain, shell, session } from 'electron';
import { join } from 'path';
import { apiService } from './services/api-service';
import { websocketProxy } from './services/websocket-proxy';

// Environment detection utilities
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

function shouldEnableDevTools(): boolean {
  // Always enable DevTools on all builds
  return true;
}

function shouldUseProductionSecurity(): boolean {
  return !isDevelopment();
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: shouldEnableDevTools(), // Disable DevTools in pure production
    },
    icon: join(__dirname, '../../resources/icon.png'),
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Set Content Security Policy
  // In development, we need 'unsafe-eval' for hot reload, but in production it should be removed
  if (shouldUseProductionSecurity()) {
    // Production CSP - stricter
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https:; " +
              "connect-src 'self' https://prod1.datalayer.run https://*.datalayer.io wss://*.datalayer.run; " +
              "font-src 'self' data:;",
          ],
        },
      });
    });
  }

  // Load the app
  if (process.env.ELECTRON_RENDERER_URL) {
    // Development mode
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    // Only open DevTools if allowed by environment settings
    if (shouldEnableDevTools()) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // Production mode
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Disable DevTools keyboard shortcuts in production
  if (!shouldEnableDevTools()) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Disable common DevTools shortcuts
      if (
        ((input.control || input.meta) &&
          input.shift &&
          input.key.toLowerCase() === 'i') || // Ctrl/Cmd+Shift+I
        (input.shift && input.key.toLowerCase() === 'c') || // Ctrl/Cmd+Shift+C
        (input.shift && input.key.toLowerCase() === 'j') || // Ctrl/Cmd+Shift+J
        input.key === 'F12'
      ) {
        event.preventDefault();
      }
    });
  }

  // Disable right-click context menu in production
  if (!shouldEnableDevTools()) {
    mainWindow.webContents.on('context-menu', event => {
      event.preventDefault();
    });
  }
}

// Create app menu
function createMenu() {
  if (process.platform === 'darwin') {
    // macOS: Create menu with app name, Edit, and Help
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: app.getName(),
        submenu: [
          {
            label: 'About ' + app.getName(),
            click: () => {
              const aboutWindow = new BrowserWindow({
                width: 450,
                height: 550,
                resizable: false,
                minimizable: false,
                maximizable: false,
                show: false,
                webPreferences: {
                  preload: join(__dirname, '../preload/about.js'),
                  nodeIntegration: false,
                  contextIsolation: true,
                  webSecurity: true,
                  devTools: shouldEnableDevTools(), // Disable DevTools in production
                },
                parent: mainWindow || undefined,
                modal: true,
              });

              aboutWindow.once('ready-to-show', () => {
                aboutWindow.show();
              });

              // Load the custom about page
              aboutWindow.loadFile(join(__dirname, 'about.html'));

              // Remove menu from about window
              aboutWindow.setMenu(null);

              // Allow closing with ESC key
              aboutWindow.webContents.on(
                'before-input-event',
                (_event, input) => {
                  if (input.key === 'Escape') {
                    aboutWindow.close();
                  }
                }
              );

              // Handle close button click from renderer
              const closeHandler = () => {
                if (aboutWindow && !aboutWindow.isDestroyed()) {
                  aboutWindow.close();
                }
              };

              ipcMain.on('close-about-window', closeHandler);

              // Clean up handler when window is closed
              aboutWindow.on('closed', () => {
                ipcMain.removeListener('close-about-window', closeHandler);
              });
            },
          },
          { type: 'separator' },
          { role: 'services', submenu: [] },
          { type: 'separator' },
          { label: 'Hide ' + app.getName(), role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', role: 'undo' },
          { label: 'Redo', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', role: 'cut' },
          { label: 'Copy', role: 'copy' },
          { label: 'Paste', role: 'paste' },
          { label: 'Paste and Match Style', role: 'pasteAndMatchStyle' },
          { label: 'Delete', role: 'delete' },
          { label: 'Select All', role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
          },
        ],
      },
      {
        label: 'View',
        submenu: [
          { label: 'Reload', role: 'reload' },
          { label: 'Force Reload', role: 'forceReload' },
          ...(shouldEnableDevTools()
            ? [
                {
                  label: 'Toggle Developer Tools',
                  role: 'toggleDevTools' as const,
                },
                { type: 'separator' as const },
              ]
            : []),
          { label: 'Actual Size', role: 'resetZoom' },
          { label: 'Zoom In', role: 'zoomIn' },
          { label: 'Zoom Out', role: 'zoomOut' },
          { type: 'separator' },
          { label: 'Toggle Fullscreen', role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { label: 'Minimize', role: 'minimize' },
          { label: 'Close', role: 'close' },
          { type: 'separator' },
          { label: 'Bring All to Front', role: 'front' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click: () => {
              shell.openExternal('https://datalayer.io');
            },
          },
          {
            label: 'Documentation',
            click: () => {
              shell.openExternal('https://docs.datalayer.io');
            },
          },
          {
            label: 'GitHub',
            click: () => {
              shell.openExternal('https://github.com/datalayer/core');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    // Non-macOS: Show File, Edit, View, and Help menus
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            accelerator: 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { label: 'Undo', role: 'undo' },
          { label: 'Redo', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', role: 'cut' },
          { label: 'Copy', role: 'copy' },
          { label: 'Paste', role: 'paste' },
          { label: 'Delete', role: 'delete' },
          { label: 'Select All', role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { label: 'Reload', role: 'reload' },
          { label: 'Force Reload', role: 'forceReload' },
          ...(shouldEnableDevTools()
            ? [
                {
                  label: 'Toggle Developer Tools',
                  role: 'toggleDevTools' as const,
                },
                { type: 'separator' as const },
              ]
            : []),
          { label: 'Actual Size', role: 'resetZoom' },
          { label: 'Zoom In', role: 'zoomIn' },
          { label: 'Zoom Out', role: 'zoomOut' },
          { type: 'separator' },
          { label: 'Toggle Fullscreen', role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click: () => {
              shell.openExternal('https://datalayer.io');
            },
          },
          {
            label: 'Documentation',
            click: () => {
              shell.openExternal('https://docs.datalayer.io');
            },
          },
          {
            label: 'GitHub',
            click: () => {
              shell.openExternal('https://github.com/datalayer/core');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// IPC handler for opening external links
ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url);
});

// IPC handlers for renderer communication
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

// Datalayer API IPC handlers
ipcMain.handle('datalayer:login', async (_, { runUrl, token }) => {
  return apiService.login(runUrl, token);
});

ipcMain.handle('datalayer:logout', async () => {
  return apiService.logout();
});

ipcMain.handle('datalayer:get-credentials', () => {
  return apiService.getCredentialsWithToken();
});

// About dialog handlers
ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url);
});

ipcMain.handle('datalayer:get-environments', async () => {
  return apiService.getEnvironments();
});

ipcMain.handle('datalayer:create-runtime', async (_, options) => {
  log.info(
    '🎯 [IPC] Received datalayer:create-runtime request with options:',
    options
  );
  const result = await apiService.createRuntime(options);
  log.info('🎯 [IPC] datalayer:create-runtime result:', result);
  return result;
});

ipcMain.handle('datalayer:delete-runtime', async (_, podName) => {
  return apiService.deleteRuntime(podName);
});
ipcMain.handle('datalayer:get-runtime-details', async (_, runtimeId) => {
  return apiService.getRuntimeDetails(runtimeId);
});

ipcMain.handle('datalayer:is-runtime-active', async (_, podName) => {
  return apiService.isRuntimeActive(podName);
});

ipcMain.handle('datalayer:list-user-runtimes', async () => {
  return apiService.listUserRuntimes();
});

ipcMain.handle('datalayer:request', async (_, { endpoint, options }) => {
  return apiService.makeRequest(endpoint, options);
});

ipcMain.handle('datalayer:list-notebooks', async () => {
  return apiService.listNotebooks();
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
      const result = await apiService.createNotebook(
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

ipcMain.handle('datalayer:delete-notebook', async (_, { spaceId, itemId }) => {
  log.info(`[IPC] deleteNotebook handler called with:`, {
    spaceId,
    itemId,
  });
  try {
    const result = await apiService.deleteNotebook(spaceId, itemId);
    log.info(`[IPC] deleteNotebook result:`, result);
    return result;
  } catch (error) {
    log.error(`[IPC] deleteNotebook error:`, error);
    throw error;
  }
});

ipcMain.handle('datalayer:get-user-spaces', async () => {
  return apiService.getUserSpaces();
});

ipcMain.handle('datalayer:get-space-items', async (_, spaceId: string) => {
  return apiService.getSpaceItems(spaceId);
});

ipcMain.handle('datalayer:get-collaboration-session', async (_, documentId) => {
  return apiService.getCollaborationSessionId(documentId);
});

ipcMain.handle('datalayer:get-collaboration-token', async () => {
  // Return the real token for collaboration WebSocket authentication
  const credentials = apiService.getCredentialsWithToken();
  return credentials;
});

// User and GitHub API IPC handlers
ipcMain.handle('datalayer:current-user', async () => {
  return apiService.getCurrentUser();
});

ipcMain.handle('datalayer:github-user', async (_, githubId: number) => {
  return apiService.getGitHubUser(githubId);
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

// WebSocket Proxy IPC handlers
ipcMain.handle(
  'proxy:websocket-open',
  async (_, { url, protocol, headers, runtimeId }) => {
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    try {
      const result = websocketProxy.open(
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
  websocketProxy.send(id, data);
  return { success: true };
});

ipcMain.handle('proxy:websocket-close', async (_, { id, code, reason }) => {
  websocketProxy.close(id, code, reason);
  return { success: true };
});

ipcMain.handle('proxy:websocket-close-runtime', async (_, { runtimeId }) => {
  websocketProxy.closeConnectionsForRuntime(runtimeId);
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

// App event handlers
app.whenReady().then(() => {
  // Set the dock icon on macOS
  if (process.platform === 'darwin') {
    const iconPath = join(__dirname, '../../resources/icon.png');
    app.dock.setIcon(iconPath);
  }

  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
