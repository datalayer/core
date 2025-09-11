/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron';
import { join } from 'path';
import log from 'electron-log/main';
import { shouldEnableDevTools } from '../util';

export default function createMenu(mainWindow: BrowserWindow) {
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
                  devTools: shouldEnableDevTools(),
                },
                parent: mainWindow,
                modal: true,
              });

              aboutWindow.once('ready-to-show', () => {
                aboutWindow.show();
              });

              aboutWindow.loadFile(join(__dirname, 'about.html'));
              aboutWindow.setMenu(null);

              aboutWindow.webContents.on(
                'before-input-event',
                (_event, input) => {
                  if (input.key === 'Escape') {
                    aboutWindow.close();
                  }
                }
              );

              const closeHandler = () => {
                if (aboutWindow && !aboutWindow.isDestroyed()) {
                  aboutWindow.close();
                }
              };

              ipcMain.on('close-about-window', closeHandler);

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

  log.debug('Application menu created');
}
