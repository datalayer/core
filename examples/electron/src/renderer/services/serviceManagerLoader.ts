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
    const services = await import('../utils/jupyterlab-services-proxy.js');
    console.log('[ServiceManagerLoader] Loaded jupyterlab-services-proxy');
    console.log('[ServiceManagerLoader] Services type:', typeof services);
    console.log(
      '[ServiceManagerLoader] Keys:',
      services ? Object.keys(services) : 'null'
    );

    // Log each key individually to avoid conversion issues
    if (services) {
      for (const key of Object.keys(services)) {
        const value = services[key];
        const valueType = typeof value;
        console.log(
          `[ServiceManagerLoader] Export '${key}': type=${valueType}, isFunction=${valueType === 'function'}, constructor=${value?.constructor?.name || 'N/A'}`
        );
      }
    }

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
      '[ServiceManagerLoader] Successfully loaded real ServiceManager'
    );
    console.log(
      '[ServiceManagerLoader] ServiceManager type:',
      typeof realServiceManager
    );
    console.log(
      '[ServiceManagerLoader] ServiceManager constructor name:',
      realServiceManager?.constructor?.name || 'N/A'
    );
    console.log(
      '[ServiceManagerLoader] ServiceManager is a constructor?',
      typeof realServiceManager === 'function'
    );
    console.log(
      '[ServiceManagerLoader] Successfully loaded real ServerConnection'
    );
    console.log(
      '[ServiceManagerLoader] ServerConnection type:',
      typeof realServerConnection
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
