/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use the API safely
contextBridge.exposeInMainWorld('aboutAPI', {
  close: () => {
    ipcRenderer.send('close-about-window');
  },
  openExternal: url => {
    ipcRenderer.send('open-external', url);
  },
  getVersion: () => {
    return ipcRenderer.invoke('get-version');
  },
});

// Populate version information when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
  const appVersionElement = document.getElementById('app-version');
  const electronVersionElement = document.getElementById('electron-version');
  const nodeVersionElement = document.getElementById('node-version');
  const chromeVersionElement = document.getElementById('chrome-version');

  try {
    const versions = await ipcRenderer.invoke('get-version');

    if (appVersionElement && versions.app) {
      appVersionElement.textContent = versions.app;
    }
    if (electronVersionElement && versions.electron) {
      electronVersionElement.textContent = versions.electron;
    }
    if (nodeVersionElement && versions.node) {
      nodeVersionElement.textContent = versions.node;
    }
    if (chromeVersionElement && versions.chrome) {
      chromeVersionElement.textContent = versions.chrome;
    }
  } catch (error) {
    console.error('Failed to get version information:', error);
    // Fallback to process versions if available
    if (electronVersionElement) {
      electronVersionElement.textContent =
        process.versions.electron || 'Unknown';
    }
    if (nodeVersionElement) {
      nodeVersionElement.textContent = process.versions.node || 'Unknown';
    }
    if (chromeVersionElement) {
      chromeVersionElement.textContent = process.versions.chrome || 'Unknown';
    }
  }
});
