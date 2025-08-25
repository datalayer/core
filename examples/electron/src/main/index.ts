/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { app, BrowserWindow, Menu, ipcMain, shell, session } from 'electron';
import { join } from 'path';
import { apiService } from './services/api-service';

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
  const isDev = process.env.ELECTRON_RENDERER_URL ? true : false;
  if (!isDev) {
    // Production CSP - stricter
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https://prod1.datalayer.run https://*.datalayer.io; " +
            "font-src 'self' data:;"
          ]
        }
      });
    });
  }

  // Load the app
  if (process.env.ELECTRON_RENDERER_URL) {
    // Development mode
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
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
}

// Create app menu
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Notebook',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'new-notebook');
          },
        },
        {
          label: 'Open Notebook',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'open-notebook');
          },
        },
        {
          label: 'Save Notebook',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'save-notebook');
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: 'Kernel',
      submenu: [
        {
          label: 'Restart Kernel',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'restart-kernel');
          },
        },
        {
          label: 'Interrupt Kernel',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'interrupt-kernel');
          },
        },
        {
          label: 'Shutdown Kernel',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'shutdown-kernel');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        {
          label: 'Toggle Developer Tools',
          accelerator:
            process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow?.webContents.toggleDevTools();
          },
        },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          role: 'togglefullscreen',
        },
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

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'About ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Services', role: 'services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide ' + app.getName(),
          accelerator: 'Command+H',
          role: 'hide',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideOthers',
        },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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
  return apiService.getCredentials();
});

ipcMain.handle('datalayer:get-environments', async () => {
  return apiService.getEnvironments();
});

ipcMain.handle('datalayer:create-runtime', async (_, options) => {
  return apiService.createRuntime(options);
});

ipcMain.handle('datalayer:request', async (_, { endpoint, options }) => {
  return apiService.makeRequest(endpoint, options);
});

ipcMain.handle('datalayer:list-notebooks', async () => {
  return apiService.listNotebooks();
});

// App event handlers
app.whenReady().then(() => {
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
