/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { YNotebook } from '@jupyter/ydoc';
import { WebsocketProvider } from 'y-websocket';
import { URLExt } from '@jupyterlab/coreutils';
import { Signal } from '@lumino/signaling';
import type {
  ICollaborationProvider,
  ICollaborationProviderEvents,
} from '@datalayer/jupyter-react';

// Import CollaborationStatus enum separately since it's exported
enum CollaborationStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}
import { requestDatalayerCollaborationSessionId } from './DatalayerCollaboration';
import { datalayerStore } from '../state/DatalayerState';

/**
 * Configuration for Datalayer collaboration provider
 */
export interface IDatalayerCollaborationConfig {
  /**
   * Base URL for the Datalayer server (optional, uses config from store if not provided)
   */
  runUrl?: string;
  /**
   * Authentication token (optional, uses config from store if not provided)
   */
  token?: string;
}

/**
 * Datalayer collaboration provider
 *
 * This provider connects to Datalayer's collaboration service using WebSockets.
 */
export class DatalayerCollaborationProvider implements ICollaborationProvider {
  readonly type = 'datalayer';

  private _status: CollaborationStatus = CollaborationStatus.Disconnected;
  private _provider: WebsocketProvider | null = null;
  private _sharedModel: YNotebook | null = null;
  private _statusChanged = new Signal<this, CollaborationStatus>(this);
  private _errorOccurred = new Signal<this, Error>(this);
  private _syncStateChanged = new Signal<this, boolean>(this);
  private _isDisposed = false;

  private _config: IDatalayerCollaborationConfig;
  private _onSync: ((isSynced: boolean) => void) | null = null;
  private _onConnectionClose: ((event: CloseEvent | null) => void) | null =
    null;

  constructor(config: IDatalayerCollaborationConfig) {
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
    options?: Record<string, any>,
  ): Promise<void> {
    if (this.isConnected) {
      console.warn('Already connected to Datalayer collaboration service');
      return;
    }

    this.setStatus(CollaborationStatus.Connecting);

    try {
      // Get configuration from store or use provided config
      const { datalayerConfig } = datalayerStore.getState();
      const runUrl = this._config.runUrl ?? datalayerConfig?.runUrl;
      const token = this._config.token ?? datalayerConfig?.token;

      if (!runUrl) {
        throw new Error('Datalayer runUrl is not configured');
      }
      if (!token) {
        throw new Error('Datalayer token is not configured');
      }

      const { ydoc, awareness } = sharedModel;

      // Build WebSocket URL
      const documentURL = URLExt.join(runUrl, '/api/spacer/v1/documents');
      const wsUrl = documentURL.replace(/^http/, 'ws');

      // Request collaboration session from Datalayer
      const sessionId = await requestDatalayerCollaborationSessionId({
        url: URLExt.join(documentURL, documentId),
        token,
      });

      // Create WebSocket provider
      this._provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
        disableBc: true,
        params: {
          sessionId,
          token,
        },
        awareness,
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

      console.log('Connected to Datalayer collaboration service');
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
    console.warn('Collaboration connection closed:', event);
    this.setStatus(CollaborationStatus.Disconnected);

    // Handle session expiration (code 4002)
    if (event.code === 4002) {
      console.warn('Datalayer collaboration session expired');
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
    // Signals don't need explicit disposal in Lumino
    // They are cleaned up when the object is garbage collected
    this._isDisposed = true;
  }
}

// Export the provider for direct instantiation
export default DatalayerCollaborationProvider;
