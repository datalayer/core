/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  loadJupyterConfig,
  JupyterReactTheme,
  createServerSettings,
  setJupyterServerUrl,
  setJupyterServerToken,
  getJupyterServerUrl,
  getJupyterServerToken,
} from '@datalayer/jupyter-react';
import { ServiceManager } from '@jupyterlab/services';
import { coreStore } from '../state/substates/CoreState';
import { iamStore } from '../state';
import { getSelectedExample, getSelectedExampleName } from './example-selector';
import { createDatalayerServiceManager } from '../services/DatalayerServiceManager';

// Load configurations from DOM
const loadConfigurations = () => {
  // Load Datalayer configuration
  const datalayerConfigElement = document.getElementById(
    'datalayer-config-data',
  );
  if (datalayerConfigElement?.textContent) {
    try {
      const datalayerConfig = JSON.parse(datalayerConfigElement.textContent);
      if (datalayerConfig.runUrl) {
        console.log('Setting Datalayer config:', datalayerConfig);
        coreStore.getState().setConfiguration(datalayerConfig);

        // Also set the token in the IAM store for API authentication
        if (datalayerConfig.token) {
          // Use the setLogin method to set the token in IAM store
          // For now, we'll just set a minimal user object since we don't have full user data
          iamStore.getState().setLogin(
            {
              id: 'example-id',
              handle: 'example-user',
              email: 'example@datalayer.com',
              firstName: 'Example',
              lastName: 'User',
              initials: 'EU',
              displayName: 'Example User',
              avatarUrl: '',
              roles: [],
              setRoles: () => {},
              iamProviders: [],
              settings: {} as any,
              unsubscribedFromOutbounds: false,
              onboarding: {} as any,
              events: [],
            },
            datalayerConfig.token,
          );
        }
      }
    } catch (e) {
      console.error('Failed to parse Datalayer config:', e);
    }
  }

  // Load Jupyter configuration
  loadJupyterConfig();

  // Also set Jupyter server URL and token if available in jupyter-config-data
  const jupyterConfigElement = document.getElementById('jupyter-config-data');
  if (jupyterConfigElement?.textContent) {
    try {
      const jupyterConfig = JSON.parse(jupyterConfigElement.textContent);
      if (jupyterConfig.baseUrl) {
        setJupyterServerUrl(jupyterConfig.baseUrl);
      }
      if (jupyterConfig.token) {
        setJupyterServerToken(jupyterConfig.token);
      }
    } catch (e) {
      console.error('Failed to parse Jupyter config:', e);
    }
  }
};

// Main App component that loads and renders the selected example
const ExampleApp: React.FC = () => {
  const [ExampleComponent, setExampleComponent] =
    useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceManager, setServiceManager] =
    useState<ServiceManager.IManager | null>(null);

  useEffect(() => {
    // Load configurations
    loadConfigurations();

    // Create service manager
    const createManager = async () => {
      const { configuration } = coreStore.getState();

      // Try to use DatalayerServiceManager if we have a token
      if (configuration?.token) {
        console.log('Using DatalayerServiceManager with token');
        try {
          const manager = await createDatalayerServiceManager(
            configuration.cpuEnvironment || 'python-3.11',
            configuration.credits || 100,
          );
          await manager.ready;
          console.log('DatalayerServiceManager is ready');
          setServiceManager(manager);
          return;
        } catch (error) {
          console.error('Failed to create DatalayerServiceManager:', error);
          console.log('Falling back to regular ServiceManager');
        }
      }

      // Fall back to regular ServiceManager
      console.log('Using regular ServiceManager (no Datalayer token)');
      const serverSettings = createServerSettings(
        getJupyterServerUrl(),
        getJupyterServerToken(),
      );
      const manager = new ServiceManager({ serverSettings });
      await manager.ready;
      console.log('Regular ServiceManager is ready');
      setServiceManager(manager);
    };

    createManager();

    // Load the selected example
    const loadExample = async () => {
      try {
        const exampleLoader = getSelectedExample();
        const module = await exampleLoader();
        setExampleComponent(() => module.default);
        setLoading(false);
      } catch (e) {
        console.error('Failed to load example:', e);
        setError(`Failed to load example: ${e}`);
        setLoading(false);
      }
    };

    loadExample();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Example: {getSelectedExampleName()}</h2>
        <p>Please wait...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error Loading Example</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!ExampleComponent) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Example Not Found</h2>
        <p>The selected example could not be loaded.</p>
      </div>
    );
  }

  // Check if the example component expects props
  // Most examples will need serviceManager
  const exampleProps: any = {};
  if (serviceManager) {
    exampleProps.serviceManager = serviceManager;
  }

  return (
    <JupyterReactTheme>
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <div
          style={{
            padding: '10px',
            background: '#f0f0f0',
            borderBottom: '1px solid #ccc',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          Running Example: <strong>{getSelectedExampleName()}</strong>
        </div>
        <div style={{ height: 'calc(100vh - 40px)', overflow: 'auto' }}>
          <ExampleComponent {...exampleProps} />
        </div>
      </div>
    </JupyterReactTheme>
  );
};

// Mount the app
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<ExampleApp />);
} else {
  console.error('Root element not found');
}
