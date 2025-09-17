/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Runtime loader for ServiceManager that handles CommonJS/ESM issues
 */

let realServiceManager: any = null;
let realServerConnection: any = null;

/**
 * Dynamically load the real ServiceManager at runtime
 */
export async function loadServiceManager() {
  if (realServiceManager) {
    console.log('[ServiceManagerLoader] Using cached ServiceManager');
    return {
      ServiceManager: realServiceManager,
      ServerConnection: realServerConnection,
    };
  }

  console.log(
    '[ServiceManagerLoader] Loading @jupyterlab/services dynamically...'
  );

  try {
    // Import the proxy file instead which has the proper exports
    // @ts-expect-error Dynamic import of JS file - types not available
    const services = await import('../polyfills/jupyterlab-proxy.js');
    console.log('[ServiceManagerLoader] Loaded jupyterlab-services-proxy');
    console.log(
      '[ServiceManagerLoader] Services loaded with',
      services ? Object.keys(services).length : 0,
      'exports'
    );

    // Extract ServiceManager and ServerConnection
    realServiceManager = services?.ServiceManager;
    realServerConnection = services?.ServerConnection;

    if (!realServiceManager) {
      console.error(
        '[ServiceManagerLoader] ServiceManager not found in services'
      );
      console.error(
        '[ServiceManagerLoader] Available exports:',
        services ? Object.keys(services) : 'null'
      );

      // Check if it's wrapped in default or another property
      if (services?.default) {
        console.log('[ServiceManagerLoader] Checking default export...');
        realServiceManager = services.default?.ServiceManager;
        realServerConnection = services.default?.ServerConnection;
      }

      if (!realServiceManager) {
        throw new Error(
          'Failed to import ServiceManager from @jupyterlab/services'
        );
      }
    }

    console.log(
      '[ServiceManagerLoader] Successfully loaded ServiceManager and ServerConnection'
    );

    return {
      ServiceManager: realServiceManager,
      ServerConnection: realServerConnection,
    };
  } catch (error) {
    console.error('Failed to load ServiceManager:', error);
    throw error;
  }
}

/**
 * Create a service manager instance using the dynamically loaded class
 */
export async function createServiceManager(options?: any) {
  const { ServiceManager } = await loadServiceManager();
  if (!ServiceManager) {
    throw new Error('ServiceManager could not be loaded');
  }
  return new ServiceManager(options);
}
