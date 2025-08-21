/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ServerConnection, ServiceManager } from '@jupyterlab/services';
import { coreStore } from '../state/substates/CoreState';
import { DEFAULT_DATALAYER_CONFIG } from '../config/Configuration';
import { createRuntime } from '../api/runtimes/actions';

/**
 * Creates a ServiceManager configured for Datalayer's infrastructure
 *
 * This function requests a new kernel from Datalayer's platform and
 * returns a configured ServiceManager that connects to the allocated
 * Jupyter server instance.
 *
 * @param environmentName - The name of the Datalayer environment to use
 * @param credits - The credit limit for this kernel session
 * @returns A configured ServiceManager instance
 * @throws Error if the kernel request fails or configuration is missing
 *
 * @example
 * ```typescript
 * const serviceManager = await createDatalayerServiceManager('python-cpu-env', 100);
 * await serviceManager.ready;
 * // Use the service manager with notebooks
 * ```
 */
export const createDatalayerServiceManager = async (
  environmentName?: string,
  credits?: number,
): Promise<ServiceManager.IManager> => {
  const { configuration } = coreStore.getState();
  const token = configuration?.token || '';

  // Use provided values or fall back to config or defaults
  const actualEnvironmentName =
    environmentName ||
    configuration?.cpuEnvironment ||
    DEFAULT_DATALAYER_CONFIG.cpuEnvironment!;
  const actualCredits =
    credits ?? configuration?.credits ?? DEFAULT_DATALAYER_CONFIG.credits!;

  if (!token) {
    throw new Error(
      'Datalayer API token is required to create a service manager',
    );
  }

  try {
    // Use the existing createRuntime function which handles auth properly
    const runtime = await createRuntime({
      environmentName: actualEnvironmentName,
      type: 'notebook',
      givenName: `Jupyter React Kernel - ${new Date().toISOString()}`,
      creditsLimit: actualCredits,
      capabilities: [],
    });

    const serverSettings = ServerConnection.makeSettings({
      baseUrl: runtime.ingress,
      wsUrl: runtime.ingress.replace(/^http/, 'ws'),
      token: runtime.token,
      appendToken: true,
    });

    const serviceManager = new ServiceManager({ serverSettings });

    console.log('Created Datalayer service manager:', {
      environmentName: actualEnvironmentName,
      credits: actualCredits,
      reservationId: runtime.reservation_id,
      ingress: runtime.ingress,
    });

    return serviceManager;
  } catch (error) {
    console.error('Error creating Datalayer service manager:', error);
    throw error;
  }
};

export default createDatalayerServiceManager;
