/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { ServerConnection } from '@jupyterlab/services';
import { ServiceManagerLess } from '@datalayer/jupyter-react';
import { DATALAYER_JUPYTER_SERVER_URL, DATALAYER_JUPYTER_SERVER_TOKEN } from '../config/DatalayerDefaults';

/**
 * Datalayer-specific ServiceManager that extends ServiceManagerLess
 * with Datalayer defaults and configuration.
 */
export class DatalayerServiceManager extends ServiceManagerLess {
  constructor(serverSettings?: ServerConnection.ISettings) {
    // Use Datalayer defaults if no settings provided
    const settings = serverSettings ?? ServerConnection.makeSettings({
      baseUrl: DATALAYER_JUPYTER_SERVER_URL,
      wsUrl: DATALAYER_JUPYTER_SERVER_URL.replace(/^http/, 'ws'),
      token: DATALAYER_JUPYTER_SERVER_TOKEN,
    });
    
    super(settings);
    
    // Override the name for Datalayer service manager
    this.__NAME__ = 'DatalayerServiceManager';
  }
}

export default DatalayerServiceManager;