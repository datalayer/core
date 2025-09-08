/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// CRITICAL: Load underscore/lodash FIRST for Backbone
import './preload-underscore';

// Apply polyfills - Node.js built-ins and constructor fixes
import './utils/lodash-polyfills';
import './utils/polyfills';
import './utils/requirejs-shim';

// MathJax configuration now handled early in polyfills.js
// This ensures it's available before JupyterLab components try to access it

import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadJupyterConfig } from '@datalayer/jupyter-react';
import App from './App';
import './index.css';

// Note: Electron APIs are only available when running in Electron environment
// In browser mode, the app will show "Not in Electron environment" message

// Load Jupyter configuration
loadJupyterConfig();

// Get Datalayer configuration from environment
const loadDatalayerConfig = async () => {
  if (window.electronAPI) {
    const env = await window.electronAPI.getEnv();
    if (env.DATALAYER_RUN_URL && env.DATALAYER_TOKEN) {
      // Store in window for now (in production, use proper state management)
      (window as any).datalayerConfig = {
        runUrl: env.DATALAYER_RUN_URL,
        token: env.DATALAYER_TOKEN,
      };
    }
  }
};

// Initialize and render app
const init = async () => {
  await loadDatalayerConfig();

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

init();
