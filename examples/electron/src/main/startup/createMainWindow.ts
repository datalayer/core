/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { BrowserWindow, shell, session } from 'electron';
import { join } from 'path';
import log from 'electron-log/main';
import { shouldEnableDevTools, shouldUseProductionSecurity } from '../util';

export default function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: shouldEnableDevTools(),
    },
    icon: join(__dirname, '../../resources/icon.png'),
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Set Content Security Policy
  if (shouldUseProductionSecurity()) {
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
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    if (shouldEnableDevTools()) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    log.debug('Main window closed');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Disable DevTools keyboard shortcuts in production
  if (!shouldEnableDevTools()) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        ((input.control || input.meta) &&
          input.shift &&
          input.key.toLowerCase() === 'i') ||
        (input.shift && input.key.toLowerCase() === 'c') ||
        (input.shift && input.key.toLowerCase() === 'j') ||
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

  log.debug('Main window created');
  return mainWindow;
}
