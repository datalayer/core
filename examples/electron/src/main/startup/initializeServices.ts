/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import log from 'electron-log/main';
import ConfigManager from '../config';
import { handleError } from '../errorHandler';
import DatalayerApiService from '../services/datalayer-api.service';
import WebSocketProxyService from '../services/websocket-proxy.service';

const initServicesHelper = async () => {
  log.debug('Starting service initialization...');

  // Initialize Config Manager first
  log.debug('Starting Config Manager...');
  const configManager = ConfigManager.getInstance();
  configManager.registerIPCHandlers();

  // Initialize Datalayer API Service
  log.debug('Starting Datalayer API Service...');
  const datalayerApiService = DatalayerApiService.getInstance();
  datalayerApiService.registerIPCHandlers();

  // Initialize WebSocket Proxy Service
  log.debug('Starting WebSocket Proxy Service...');
  const webSocketProxyService = WebSocketProxyService.getInstance();
  webSocketProxyService.registerIPCHandlers();

  log.debug('Services initialization completed');
};

const initializeServices = async () => {
  try {
    await initServicesHelper();
  } catch (err) {
    log.error('Service initialization failed:', err);
    handleError(err as Error, true);
  }
};

export default initializeServices;
