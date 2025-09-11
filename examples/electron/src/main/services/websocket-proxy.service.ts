/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { BrowserWindow } from 'electron';
import WebSocket from 'ws';
import log from 'electron-log/main';
import BaseService from '../models/base.service';
import { CHANNELS } from '../../shared/channels';

interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  url: string;
  protocol?: string;
  headers?: Record<string, string>;
  runtimeId?: string;
}

export default class WebSocketProxyService extends BaseService {
  protected readonly channel = CHANNELS.WEBSOCKET_PROXY;
  protected readonly allowedMethods = new Set([
    'open',
    'send',
    'close',
    'closeConnectionsForRuntime',
    'closeAllConnections',
  ]);

  private static instance: WebSocketProxyService;
  private connections = new Map<string, WebSocketConnection>();
  private connectionCounter = 0;
  private windowConnections = new Map<BrowserWindow, Set<string>>();
  private runtimeConnections = new Map<string, Set<string>>();

  public static getInstance(): WebSocketProxyService {
    if (!WebSocketProxyService.instance) {
      WebSocketProxyService.instance = new WebSocketProxyService();
    }
    return WebSocketProxyService.instance;
  }

  constructor() {
    super();
  }

  /**
   * Open a new WebSocket connection
   */
  open(
    window: BrowserWindow,
    url: string,
    protocol?: string,
    headers?: Record<string, string>,
    runtimeId?: string
  ): { id: string } {
    // Check if this runtime has been terminated
    if (runtimeId) {
      const cleanupRegistry = (global as any).__datalayerRuntimeCleanup;
      if (
        cleanupRegistry &&
        cleanupRegistry.has(runtimeId) &&
        cleanupRegistry.get(runtimeId).terminated
      ) {
        log.debug(
          `[WebSocket Proxy] 🛑 BLOCKED: Preventing new connection to terminated runtime ${runtimeId}`
        );
        throw new Error(
          `Runtime ${runtimeId} has been terminated - no new connections allowed`
        );
      }
    }

    const id = `ws-${++this.connectionCounter}`;
    log.debug(`[WebSocket Proxy] Opening connection ${id} to ${url}`);

    try {
      const wsOptions: any = {};
      if (protocol) {
        wsOptions.protocol = protocol;
      }
      if (headers) {
        wsOptions.headers = headers;
      }

      const ws = new WebSocket(url, wsOptions);

      const connection: WebSocketConnection = {
        id,
        ws,
        url,
        protocol,
        headers,
        runtimeId,
      };

      this.connections.set(id, connection);

      // Track by window
      if (!this.windowConnections.has(window)) {
        this.windowConnections.set(window, new Set());
      }
      this.windowConnections.get(window)!.add(id);

      // Track by runtime
      if (runtimeId) {
        if (!this.runtimeConnections.has(runtimeId)) {
          this.runtimeConnections.set(runtimeId, new Set());
        }
        this.runtimeConnections.get(runtimeId)!.add(id);
      }

      // Set up WebSocket event handlers
      ws.on('open', () => {
        log.debug(`[WebSocket Proxy] Connection ${id} opened`);
        window.webContents.send('websocket:open', { id });
      });

      ws.on('message', data => {
        log.debug(
          `[WebSocket Proxy] Message from ${id}: ${data.toString().substring(0, 100)}...`
        );
        window.webContents.send('websocket:message', {
          id,
          data: data.toString(),
        });
      });

      ws.on('close', (code, reason) => {
        log.debug(
          `[WebSocket Proxy] Connection ${id} closed: ${code} ${reason}`
        );
        this.cleanupConnection(id);
        window.webContents.send('websocket:close', {
          id,
          code,
          reason: reason.toString(),
        });
      });

      ws.on('error', error => {
        log.error(`[WebSocket Proxy] Error on connection ${id}:`, error);
        this.cleanupConnection(id);
        window.webContents.send('websocket:error', {
          id,
          error: error.message,
        });
      });

      return { id };
    } catch (error) {
      log.error(`[WebSocket Proxy] Failed to open connection ${id}:`, error);
      throw error;
    }
  }

  /**
   * Send data to a WebSocket connection
   */
  send(id: string, data: string): void {
    const connection = this.connections.get(id);
    if (!connection) {
      log.warn(`[WebSocket Proxy] Connection ${id} not found for send`);
      return;
    }

    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(data);
      log.debug(
        `[WebSocket Proxy] Sent data to ${id}: ${data.substring(0, 100)}...`
      );
    } else {
      log.warn(`[WebSocket Proxy] Connection ${id} not in OPEN state for send`);
    }
  }

  /**
   * Close a WebSocket connection
   */
  close(id: string, code?: number, reason?: string): void {
    const connection = this.connections.get(id);
    if (!connection) {
      log.warn(`[WebSocket Proxy] Connection ${id} not found for close`);
      return;
    }

    log.debug(`[WebSocket Proxy] Closing connection ${id}`);
    connection.ws.close(code, reason);
    this.cleanupConnection(id);
  }

  /**
   * Close all connections for a specific runtime
   */
  closeConnectionsForRuntime(runtimeId: string): void {
    const connectionIds = this.runtimeConnections.get(runtimeId);
    if (!connectionIds) {
      log.debug(
        `[WebSocket Proxy] No connections found for runtime ${runtimeId}`
      );
      return;
    }

    log.debug(
      `[WebSocket Proxy] Closing ${connectionIds.size} connections for runtime ${runtimeId}`
    );

    for (const id of connectionIds) {
      this.close(id, 1000, `Runtime ${runtimeId} terminated`);
    }

    this.runtimeConnections.delete(runtimeId);
  }

  /**
   * Close all WebSocket connections
   */
  closeAllConnections(): void {
    log.debug(
      `[WebSocket Proxy] Closing all ${this.connections.size} connections`
    );

    for (const [, connection] of this.connections) {
      connection.ws.close(1000, 'Application shutdown');
    }

    this.connections.clear();
    this.runtimeConnections.clear();
    this.windowConnections.clear();
  }

  /**
   * Clean up connection tracking
   */
  private cleanupConnection(id: string): void {
    const connection = this.connections.get(id);
    if (!connection) {
      return;
    }

    this.connections.delete(id);

    // Remove from window tracking
    for (const [window, connectionIds] of this.windowConnections) {
      connectionIds.delete(id);
      if (connectionIds.size === 0) {
        this.windowConnections.delete(window);
      }
    }

    // Remove from runtime tracking
    if (connection.runtimeId) {
      const runtimeConnections = this.runtimeConnections.get(
        connection.runtimeId
      );
      if (runtimeConnections) {
        runtimeConnections.delete(id);
        if (runtimeConnections.size === 0) {
          this.runtimeConnections.delete(connection.runtimeId);
        }
      }
    }

    log.debug(`[WebSocket Proxy] Cleaned up connection ${id}`);
  }

  /**
   * Clean up before service shutdown
   */
  protected async beforeQuit(): Promise<void> {
    log.debug('[WebSocket Proxy] Cleaning up before quit');
    this.closeAllConnections();
  }
}
