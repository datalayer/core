/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadJupyterConfig } from '@datalayer/jupyter-react';
import App from './App';
import './index.css';

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
