/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/// <reference types="vite/client" />

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
import { EXAMPLES } from './example-selector';
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

      // If token is empty or still has placeholder, use environment variable from .env
      if (
        !datalayerConfig.token ||
        datalayerConfig.token.startsWith('%VITE_')
      ) {
        const envToken = import.meta.env.VITE_DATALAYER_API_TOKEN;
        if (envToken) {
          datalayerConfig.token = envToken;
        }
      }

      if (datalayerConfig.runUrl) {
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
              settings: {},
              unsubscribedFromOutbounds: false,
              onboarding: {},
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

const getExampleNames = () => Object.keys(EXAMPLES);

// Get the default example name from localStorage
const getDefaultExampleName = (): string => {
  const stored = localStorage.getItem('selectedExample');
  if (stored && EXAMPLES[stored]) {
    return stored;
  }
  return 'DatalayerNotebookExample';
};

// Main App component that loads and renders the selected example
export const ExampleApp: React.FC = () => {
  const [ExampleComponent, setExampleComponent] =
    useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceManager, setServiceManager] =
    useState<ServiceManager.IManager | null>(null);
  const [selectedExample, setSelectedExample] = useState<string>(
    getDefaultExampleName(),
  );
  const [isChangingExample, setIsChangingExample] = useState(false);

  const loadExample = async (
    exampleName: string,
    _manager: ServiceManager.IManager,
  ) => {
    try {
      setIsChangingExample(true);
      setError(null);

      const exampleLoader = EXAMPLES[exampleName];
      if (!exampleLoader) {
        throw new Error(`Example "${exampleName}" not found`);
      }

      const module = await exampleLoader();
      setExampleComponent(() => module.default);
      setIsChangingExample(false);
    } catch (e) {
      console.error('Failed to load example:', e);
      setError(`Failed to load example: ${e}`);
      setIsChangingExample(false);
    }
  };

  useEffect(() => {
    // Load configurations
    loadConfigurations();

    // Create service manager and load example - must be sequential
    const initializeApp = async () => {
      try {
        const { configuration } = coreStore.getState();

        // Try to use DatalayerServiceManager if we have a token
        if (configuration?.token) {
          try {
            const manager = await createDatalayerServiceManager(
              configuration.cpuEnvironment || 'python-3.11',
              configuration.credits || 100,
            );
            await manager.ready;
            setServiceManager(manager);

            // Load initial example
            await loadExample(selectedExample, manager);
          } catch (error) {
            console.error('Failed to create DatalayerServiceManager:', error);
            // Fall back to regular ServiceManager
            const serverSettings = createServerSettings(
              getJupyterServerUrl(),
              getJupyterServerToken(),
            );
            const manager = new ServiceManager({ serverSettings });
            await manager.ready;
            setServiceManager(manager);

            // Load initial example
            await loadExample(selectedExample, manager);
          }
        } else {
          // Use regular ServiceManager (no Datalayer token)
          const serverSettings = createServerSettings(
            getJupyterServerUrl(),
            getJupyterServerToken(),
          );
          const manager = new ServiceManager({ serverSettings });
          await manager.ready;
          setServiceManager(manager);

          // Load initial example
          await loadExample(selectedExample, manager);
        }

        setLoading(false);
      } catch (e) {
        console.error('Failed to initialize app:', e);
        setError(`Failed to initialize app: ${e}`);
        setLoading(false);
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExampleChange = async (newExample: string) => {
    if (newExample === selectedExample || !serviceManager) return;

    setSelectedExample(newExample);
    localStorage.setItem('selectedExample', newExample);
    await loadExample(newExample, serviceManager);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Example: {selectedExample}</h2>
        <p>Please wait...</p>
      </div>
    );
  }

  if (error && !ExampleComponent) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error Loading Example</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!ExampleComponent && !isChangingExample) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Example Not Found</h2>
        <p>The selected example could not be loaded.</p>
      </div>
    );
  }

  // Check if the example component expects props
  // Most examples will need serviceManager
  const exampleProps: { serviceManager?: ServiceManager.IManager } = {};
  if (serviceManager) {
    exampleProps.serviceManager = serviceManager;
  }

  return (
    <JupyterReactTheme>
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <div
          style={{
            position: 'relative',
            zIndex: 9999,
            padding: '10px 20px',
            background: '#f0f0f0',
            borderBottom: '1px solid #ccc',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <label style={{ fontWeight: 500, color: '#333' }}>
            Select Example:
          </label>
          <select
            value={selectedExample}
            onChange={e => handleExampleChange(e.target.value)}
            disabled={isChangingExample}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'white',
              cursor: isChangingExample ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              minWidth: '250px',
            }}
          >
            {getExampleNames()
              .sort()
              .map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
          {isChangingExample && (
            <span style={{ color: '#666', fontSize: '12px' }}>Loading...</span>
          )}
          {error && (
            <span
              style={{ color: '#dc3545', fontSize: '12px', marginLeft: 'auto' }}
            >
              Error: {error}
            </span>
          )}
        </div>
        <div style={{ height: 'calc(100vh - 50px)', overflow: 'auto' }}>
          {isChangingExample ? (
            <div
              style={{ padding: '40px', textAlign: 'center', color: '#666' }}
            >
              <h3>Loading {selectedExample}...</h3>
              <p>Please wait while the example loads.</p>
            </div>
          ) : ExampleComponent ? (
            <ExampleComponent {...exampleProps} />
          ) : null}
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
