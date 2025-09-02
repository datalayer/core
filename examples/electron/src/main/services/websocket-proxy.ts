/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { BrowserWindow } from 'electron';
import WebSocket from 'ws';
import log from 'electron-log/main';

interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  url: string;
  protocol?: string;
  headers?: Record<string, string>;
}

class WebSocketProxyService {
  private connections = new Map<string, WebSocketConnection>();
  private connectionCounter = 0;
  private windowConnections = new Map<BrowserWindow, Set<string>>();

  /**
   * Open a new WebSocket connection
   */
  open(
    window: BrowserWindow,
    url: string,
    protocol?: string,
    headers?: Record<string, string>
  ): { id: string } {
    const id = `ws-${++this.connectionCounter}`;

    log.debug(`[WebSocket Proxy] Opening connection ${id} to ${url}`);
    if (headers) {
      log.debug(
        `[WebSocket Proxy] With headers:`,
        Object.keys(headers).map(
          k => `${k}: ${k === 'Authorization' ? '[REDACTED]' : headers[k]}`
        )
      );
    }

    try {
      // Create WebSocket with headers
      const wsOptions: WebSocket.ClientOptions = {};
      if (headers) {
        wsOptions.headers = headers;
      }
      const ws = new WebSocket(url, protocol, wsOptions);

      this.connections.set(id, {
        id,
        ws,
        url,
        protocol,
        headers,
      });

      // Track which connections belong to which window
      if (!this.windowConnections.has(window)) {
        this.windowConnections.set(window, new Set());
      }
      this.windowConnections.get(window)?.add(id);

      // Clean up connections when window is closed
      window.once('closed', () => {
        const windowConns = this.windowConnections.get(window);
        if (windowConns) {
          windowConns.forEach(connId => {
            const connection = this.connections.get(connId);
            if (connection) {
              log.debug(
                `[WebSocket Proxy] Closing connection ${connId} due to window close`
              );
              connection.ws.close();
              this.connections.delete(connId);
            }
          });
          this.windowConnections.delete(window);
        }
      });

      // Set up event handlers
      ws.on('open', () => {
        log.debug(`[WebSocket Proxy] Connection ${id} opened`);
        if (
          !window.isDestroyed() &&
          window.webContents &&
          !window.webContents.isDestroyed()
        ) {
          window.webContents.send('websocket-event', {
            id,
            type: 'open',
          });
        }
      });

      ws.on('message', (data: WebSocket.RawData) => {
        log.debug(
          `[WebSocket Proxy] Message on ${id}:`,
          data.toString().substring(0, 100)
        );

        // Convert Buffer to appropriate format, but detect if it's actually JSON
        let messageData: string | { type: string; data: number[] };
        if (Buffer.isBuffer(data)) {
          // Check if this is actually a text/JSON message
          const str = data.toString('utf8');
          try {
            // Try to parse as JSON - if successful, it's a text message
            JSON.parse(str);
            log.debug(
              `[WebSocket Proxy] JSON message on ${id}:`,
              str.substring(0, 100)
            );
            messageData = str; // Send as string
          } catch (_e) {
            // Not JSON, treat as binary data
            log.debug(
              `[WebSocket Proxy] Binary message on ${id}, size:`,
              data.length
            );
            messageData = {
              type: 'Buffer',
              data: Array.from(data),
            };
          }
        } else if (data instanceof ArrayBuffer) {
          log.debug(
            `[WebSocket Proxy] ArrayBuffer message on ${id}, size:`,
            data.byteLength
          );
          messageData = {
            type: 'ArrayBuffer',
            data: Array.from(new Uint8Array(data)),
          };
        } else {
          // String data
          log.debug(
            `[WebSocket Proxy] String message on ${id}:`,
            data.toString().substring(0, 100)
          );
          messageData = data.toString();
        }

        if (
          !window.isDestroyed() &&
          window.webContents &&
          !window.webContents.isDestroyed()
        ) {
          window.webContents.send('websocket-event', {
            id,
            type: 'message',
            data: messageData,
          });
        }
      });

      ws.on('close', (code: number, reason: Buffer) => {
        log.debug(
          `[WebSocket Proxy] Connection ${id} closed: ${code} ${reason}`
        );
        this.connections.delete(id);
        // Remove from window tracking
        this.windowConnections.forEach(connIds => {
          connIds?.delete(id);
        });
        if (
          !window.isDestroyed() &&
          window.webContents &&
          !window.webContents.isDestroyed()
        ) {
          window.webContents.send('websocket-event', {
            id,
            type: 'close',
            code,
            reason: reason.toString(),
            wasClean: code === 1000,
          });
        }
      });

      ws.on('error', (error: Error) => {
        log.error(`[WebSocket Proxy] Error on ${id}:`, error);
        if (
          !window.isDestroyed() &&
          window.webContents &&
          !window.webContents.isDestroyed()
        ) {
          window.webContents.send('websocket-event', {
            id,
            type: 'error',
            error: error.message,
            message: error.toString(),
          });
        }
      });

      return { id };
    } catch (error) {
      log.error(`[WebSocket Proxy] Failed to create connection:`, error);
      throw error;
    }
  }

  /**
   * Send a message through a WebSocket connection
   */
  send(id: string, data: unknown): void {
    const connection = this.connections.get(id);
    if (!connection) {
      log.error(`[WebSocket Proxy] Connection ${id} not found`);
      return;
    }

    try {
      // Handle different data types
      if (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        'data' in data &&
        data.type === 'Buffer' &&
        Array.isArray(data.data)
      ) {
        // Reconstruct Buffer from array
        connection.ws.send(Buffer.from(data.data));
      } else if (typeof data === 'string') {
        connection.ws.send(data);
      } else if (data instanceof ArrayBuffer) {
        // Handle ArrayBuffer directly
        connection.ws.send(Buffer.from(data));
      } else {
        // Try to stringify, but handle objects that can't be stringified
        try {
          connection.ws.send(JSON.stringify(data));
        } catch (_e) {
          log.error(`[WebSocket Proxy] Cannot stringify data on ${id}:`, _e);
          // Send as string representation
          connection.ws.send(String(data));
        }
      }
      log.debug(`[WebSocket Proxy] Sent message on ${id}`);
    } catch (error) {
      log.error(`[WebSocket Proxy] Failed to send message on ${id}:`, error);
    }
  }

  /**
   * Close a WebSocket connection
   */
  close(id: string, code?: number, reason?: string): void {
    const connection = this.connections.get(id);
    if (!connection) {
      log.error(`[WebSocket Proxy] Connection ${id} not found`);
      return;
    }

    log.debug(`[WebSocket Proxy] Closing connection ${id}`);
    connection.ws.close(code, reason);
    this.connections.delete(id);
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    log.debug(
      `[WebSocket Proxy] Closing all ${this.connections.size} connections`
    );
    for (const [, connection] of this.connections) {
      connection.ws.close();
    }
    this.connections.clear();
  }
}

export const websocketProxy = new WebSocketProxyService();
