/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Electron-aware Collaboration Provider for Datalayer
 * Uses IPC bridge instead of direct HTTP requests
 */

import { YNotebook } from '@jupyter/ydoc';
import { WebsocketProvider } from 'y-websocket';
import { URLExt } from '@jupyterlab/coreutils';
import { Signal } from '@lumino/signaling';
import type {
  ICollaborationProvider,
  ICollaborationProviderEvents,
} from '@datalayer/jupyter-react';
// We'll use our ProxyWebSocket by passing it as WebSocket constructor to y-websocket

enum CollaborationStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

export interface IElectronCollaborationConfig {
  runUrl?: string;
  token?: string;
  runtimeId?: string;
}

/**
 * Electron Collaboration Provider that uses IPC for session ID requests
 */
export class ElectronCollaborationProvider implements ICollaborationProvider {
  readonly type = 'datalayer-electron';

  private _status: CollaborationStatus = CollaborationStatus.Disconnected;
  private _provider: WebsocketProvider | null = null;
  private _sharedModel: YNotebook | null = null;
  private _statusChanged = new Signal<this, CollaborationStatus>(this);
  private _errorOccurred = new Signal<this, Error>(this);
  private _syncStateChanged = new Signal<this, boolean>(this);
  private _isDisposed = false;

  private _config: IElectronCollaborationConfig;
  private _onSync: ((isSynced: boolean) => void) | null = null;
  private _onConnectionClose: ((event: CloseEvent | null) => void) | null =
    null;

  constructor(config: IElectronCollaborationConfig) {
    this._config = config;
  }

  get status(): CollaborationStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === CollaborationStatus.Connected;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get events(): ICollaborationProviderEvents {
    return {
      statusChanged: this._statusChanged,
      errorOccurred: this._errorOccurred,
      syncStateChanged: this._syncStateChanged,
    };
  }

  private setStatus(status: CollaborationStatus): void {
    if (this._status !== status) {
      this._status = status;
      this._statusChanged.emit(status);
    }
  }

  async connect(
    sharedModel: YNotebook,
    documentId: string,
    options?: Record<string, unknown>
  ): Promise<void> {
    if (this.isConnected) {
      console.info('Already connected to Datalayer collaboration service');
      return;
    }

    this.setStatus(CollaborationStatus.Connecting);

    try {
      const runUrl = this._config.runUrl;
      let configToken = this._config.token;

      if (!runUrl) {
        throw new Error('Datalayer runUrl is not configured');
      }

      if (!window.datalayerAPI) {
        throw new Error(
          'Datalayer API not available - collaboration requires IPC bridge'
        );
      }

      // Handle token securely - in Electron, the renderer stores 'secured' for security
      if (configToken === 'secured') {
        try {
          const tokenResponse =
            await window.datalayerAPI.getCollaborationToken();
          if (tokenResponse.isAuthenticated && tokenResponse.token) {
            configToken = tokenResponse.token;
          } else {
            configToken = undefined;
          }
        } catch (error) {
          console.error(
            '[ElectronCollaborationProvider] Error getting collaboration token:',
            error
          );
          configToken = undefined;
        }
      }

      const { ydoc, awareness } = sharedModel;

      // Build WebSocket URL
      const documentURL = URLExt.join(runUrl, '/api/spacer/v1/documents');
      const wsUrl = documentURL.replace(/^http/, 'ws');

      // Request collaboration session from Datalayer via IPC
      if (!window.datalayerAPI) {
        throw new Error(
          'Datalayer API not available - collaboration requires IPC bridge'
        );
      }

      // Request collaboration session from Datalayer via IPC
      // Use the generic request method if the specific collaboration method isn't available yet
      let sessionResult;
      if (window.datalayerAPI.getCollaborationSession) {
        sessionResult =
          await window.datalayerAPI.getCollaborationSession(documentId);
      } else {
        const response = await window.datalayerAPI.request(
          `/api/spacer/v1/documents/${documentId}`
        );
        if (response.success && response.data?.sessionId) {
          sessionResult = {
            success: true,
            sessionId: response.data.sessionId,
          };
        } else {
          sessionResult = {
            success: false,
            error: response.error || 'No session ID in response',
          };
        }
      }

      if (!sessionResult.success || !sessionResult.sessionId) {
        const errorMsg = sessionResult.error || 'Unknown error';
        throw new Error(`Failed to get collaboration session ID: ${errorMsg}`);
      }

      const sessionId = sessionResult.sessionId;

      // Import ProxyWebSocket class dynamically to use with WebsocketProvider
      const { ProxyWebSocket } = await import('./proxyServiceManager');

      // Create a runtime-aware WebSocket factory with runtime ID
      const runtimeId = this._config.runtimeId;
      const RuntimeProxyWebSocket = class extends ProxyWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols, undefined, runtimeId);
        }
      };

      // Configure WebSocket params
      const wsParams = {
        sessionId,
        ...(configToken && { token: configToken }), // Include real token if available
      };

      // Create WebSocket provider following original Datalayer pattern
      // Both sessionId and token are passed as params to y-websocket
      this._provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
        disableBc: true,
        params: wsParams,
        awareness,
        WebSocketPolyfill: RuntimeProxyWebSocket as typeof WebSocket,
        ...options,
      });

      this._sharedModel = sharedModel;

      // Set up event handlers
      this._onSync = (isSynced: boolean) => {
        this.handleSync(isSynced);
      };
      this._onConnectionClose = (event: CloseEvent | null) => {
        if (event) {
          this.handleConnectionClose(event);
        }
      };

      this._provider.on('sync', this._onSync);
      this._provider.on('connection-close', this._onConnectionClose);
    } catch (error) {
      this.setStatus(CollaborationStatus.Error);
      this._errorOccurred.emit(error as Error);
      throw error;
    }
  }

  disconnect(): void {
    if (this._provider) {
      if (this._onSync) {
        this._provider.off('sync', this._onSync);
      }
      if (this._onConnectionClose) {
        this._provider.off('connection-close', this._onConnectionClose);
      }
      this._provider.disconnect();
      this._provider = null;
    }
    this._sharedModel = null;
    this.setStatus(CollaborationStatus.Disconnected);
  }

  getProvider(): WebsocketProvider | null {
    return this._provider;
  }

  getSharedModel(): YNotebook | null {
    return this._sharedModel;
  }

  handleConnectionClose(event: CloseEvent): void {
    this.setStatus(CollaborationStatus.Disconnected);

    // Handle session expiration (code 4002)
    if (event.code === 4002) {
      console.info(
        '[ElectronCollaborationProvider] Collaboration session expired'
      );
      // Attempt to reconnect could be implemented here
    }
  }

  handleSync(isSynced: boolean): void {
    this._syncStateChanged.emit(isSynced);
    if (isSynced) {
      this.setStatus(CollaborationStatus.Connected);
    }
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this.disconnect();
    this._isDisposed = true;
  }
}
