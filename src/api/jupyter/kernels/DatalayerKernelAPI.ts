/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection, ServiceManager } from '@jupyterlab/services';
import { datalayerReactStore } from '../../../state/DatalayerReactState';
import { 
  IKernelRequest, 
  IKernelResponse, 
  IDatalayerKernelConfig,
  IKernelReservation
} from '../../../models/Kernel';

/**
 * API class for managing Datalayer kernels
 */
export class DatalayerKernelAPI {
  private readonly runUrl: string;
  private readonly token: string;

  constructor(runUrl?: string, token?: string) {
    // Get from store if not provided
    const datalayerConfig = datalayerReactStore.getState().datalayerConfig;
    this.runUrl = runUrl || datalayerConfig?.runUrl || 'https://prod1.datalayer.io';
    this.token = token || datalayerConfig?.token || '';
  }

  /**
   * Create a Datalayer kernel and return a Jupyter ServiceManager configured for it
   */
  async createKernelServiceManager(config: IDatalayerKernelConfig): Promise<ServiceManager> {
    const kernelResponse = await this.requestKernel(config);
    
    const serverSettings = ServerConnection.makeSettings({
      baseUrl: kernelResponse.kernel.ingress,
      wsUrl: kernelResponse.kernel.ingress.replace(/^http/, 'ws'),
      token: kernelResponse.kernel.token,
      appendToken: true,
    });
    
    return new ServiceManager({ serverSettings });
  }

  /**
   * Request a new kernel from Datalayer API
   */
  async requestKernel(config: IDatalayerKernelConfig): Promise<IKernelResponse> {
    const url = URLExt.join(
      this.runUrl,
      'api/jupyter/v1/environment',
      config.environmentName,
    );

    const request: IKernelRequest = {
      kernel_type: 'notebook',
      kernel_given_name: config.kernelName || `Jupyter React Kernel - ${new Date().toISOString()}`,
      credits_limit: config.credits,
      capabilities: config.capabilities || [],
    };

    const headers = new Headers();
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(request),
      credentials: this.token ? 'include' : 'omit',
      mode: 'cors',
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create kernel: ${response.statusText}. ${errorText}`);
    }

    return await response.json() as IKernelResponse;
  }

  /**
   * Get kernel reservation details
   */
  parseKernelReservation(response: IKernelResponse): IKernelReservation {
    return {
      reservationId: response.kernel.reservation_id,
      environmentName: response.kernel.environment_name,
      jupyterUrl: response.kernel.ingress,
      token: response.kernel.token,
      startedAt: new Date(response.kernel.started_at),
      expiredAt: new Date(response.kernel.expired_at),
    };
  }

  /**
   * Terminate a kernel reservation
   */
  async terminateKernel(reservationId: string): Promise<void> {
    const url = URLExt.join(
      this.runUrl,
      'api/jupyter/v1/reservation',
      reservationId,
    );

    const headers = new Headers();
    headers.set('Accept', 'application/json');
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: headers,
      credentials: this.token ? 'include' : 'omit',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Failed to terminate kernel: ${response.statusText}`);
    }
  }
}

/**
 * Factory function to create a Datalayer ServiceManager
 * (matches the original API from jupyter-ui)
 */
export async function createDatalayerServiceManager(
  environmentName: string, 
  credits: number
): Promise<ServiceManager> {
  const api = new DatalayerKernelAPI();
  return api.createKernelServiceManager({
    environmentName,
    credits,
  });
}