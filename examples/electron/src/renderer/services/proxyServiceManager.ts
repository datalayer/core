/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Proxy ServiceManager for Electron
 * Proxies all HTTP and WebSocket traffic through IPC
 */

import { proxyLogger } from '../utils/logger';
import { loadServiceManager } from './serviceManagerLoader';

/**
 * Custom fetch function that proxies HTTP requests through IPC
 */
async function proxyFetch(
  request: RequestInfo,
  init?: RequestInit | null
): Promise<Response> {
  const r = new Request(request, init ?? undefined);

  // Prepare request for IPC
  const method = r.method;
  const url = r.url;
  const headers: Record<string, string> = {};
  r.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body: unknown;
  if (!['GET', 'HEAD'].includes(method)) {
    const contentType = headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      body = await r.text();
      try {
        body = JSON.parse(body as string);
      } catch {
        // Keep as string if not valid JSON
      }
    } else {
      body = await r.arrayBuffer();
    }
  }

  proxyLogger.debug(`HTTP ${method} ${url}`);

  // Send through IPC proxy
  const response = await (window as any).proxyAPI.httpRequest({
    url,
    method,
    headers,
    body,
  });

  // Convert response body for Response constructor
  let responseBody: BodyInit | null = null;
  if (Array.isArray(response.body)) {
    // Convert array back to ArrayBuffer
    responseBody = new Uint8Array(response.body).buffer;
  } else if (response.body !== null && response.body !== undefined) {
    // Convert objects to JSON string, primitives to string
    if (typeof response.body === 'object') {
      responseBody = JSON.stringify(response.body);
    } else {
      responseBody = String(response.body);
    }
  }

  // Create Response object
  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Custom WebSocket class that proxies through IPC
 */
export class ProxyWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  private _readyState: number = ProxyWebSocket.CONNECTING;
  private _url: string;
  private _protocol: string;
  private _headers: Record<string, string> | undefined;
  private _id: string | null = null;
  private _eventListenerCleanup: (() => void) | null = null;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  bufferedAmount = 0;
  extensions = '';
  binaryType: BinaryType = 'blob';

  constructor(
    url: string | URL,
    protocols?: string | string[],
    headers?: Record<string, string>
  ) {
    super();

    this._url = url.toString();
    this._headers = headers;

    // Handle protocol parameter
    if (typeof protocols === 'string') {
      this._protocol = protocols;
    } else if (Array.isArray(protocols) && protocols.length > 0) {
      // Filter out jupyter-specific protocol
      const filteredProtocols = protocols.filter(
        p => p !== 'v1.kernel.websocket.jupyter.org'
      );
      this._protocol = filteredProtocols[0] || '';
    } else {
      this._protocol = '';
    }

    this._open();
  }

  get readyState(): number {
    return this._readyState;
  }

  get url(): string {
    return this._url;
  }

  get protocol(): string {
    return this._protocol;
  }

  private async _open(): Promise<void> {
    try {
      // Open connection through IPC
      const result = await (window as any).proxyAPI.websocketOpen({
        url: this._url,
        protocol: this._protocol || undefined,
        headers: this._headers,
      });

      this._id = result.id;

      // Set up event listener for WebSocket events
      const eventHandler = (event: Record<string, any>) => {
        if (event.id !== this._id) {
          return;
        }

        // Only log non-message events to reduce noise
        if (event.type !== 'message') {
          proxyLogger.debug(`Event ${event.type} for ${this._id}`);
        }

        switch (event.type) {
          case 'open':
            this._readyState = ProxyWebSocket.OPEN;
            this.dispatchEvent(new Event('open'));
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
            break;

          case 'message': {
            // Handle data conversion
            let messageData = event.data;

            // Convert Buffer representation back to proper format for JupyterLab
            if (
              messageData &&
              typeof messageData === 'object' &&
              (messageData as any).type === 'Buffer' &&
              Array.isArray((messageData as any).data)
            ) {
              // First check if this is actually a JSON message incorrectly sent as Buffer
              try {
                const str = String.fromCharCode(...(messageData as any).data);
                JSON.parse(str); // Just validate it's JSON
                messageData = str; // Send as string instead of binary
              } catch (jsonError) {
                // Not JSON, handle as actual binary data (likely heartbeat)
                try {
                  // Create ArrayBuffer with proper size and copy data
                  const buffer = new ArrayBuffer(
                    (messageData as any).data.length
                  );
                  const uint8View = new Uint8Array(buffer);

                  // Copy each byte individually to ensure correct transfer
                  for (let i = 0; i < (messageData as any).data.length; i++) {
                    uint8View[i] = (messageData as any).data[i] & 0xff; // Ensure it's a valid byte
                  }

                  messageData = buffer;
                } catch (error) {
                  proxyLogger.error(`Error converting Buffer:`, error);
                  // Fallback to original behavior
                  messageData = new Uint8Array((messageData as any).data)
                    .buffer;
                }
              }
            } else if (
              messageData &&
              typeof messageData === 'object' &&
              (messageData as any).type === 'ArrayBuffer' &&
              Array.isArray((messageData as any).data)
            ) {
              try {
                const buffer = new ArrayBuffer(
                  (messageData as any).data.length
                );
                const uint8View = new Uint8Array(buffer);
                for (let i = 0; i < (messageData as any).data.length; i++) {
                  uint8View[i] = (messageData as any).data[i] & 0xff;
                }
                messageData = buffer;
              } catch (error) {
                proxyLogger.error(`Error converting ArrayBuffer:`, error);
                messageData = new Uint8Array((messageData as any).data).buffer;
              }
            }

            const messageEvent = new MessageEvent('message', {
              data: messageData,
            });
            this.dispatchEvent(messageEvent);
            if (this.onmessage) {
              this.onmessage(messageEvent);
            }
            break;
          }

          case 'close': {
            this._readyState = ProxyWebSocket.CLOSED;
            const closeEvent = new CloseEvent('close', {
              code: (event as any).code,
              reason: (event as any).reason,
              wasClean: (event as any).wasClean,
            });
            this.dispatchEvent(closeEvent);
            if (this.onclose) {
              this.onclose(closeEvent);
            }
            this._cleanup();
            break;
          }

          case 'error': {
            const errorEvent = new Event('error');
            this.dispatchEvent(errorEvent);
            if (this.onerror) {
              this.onerror(errorEvent);
            }
            break;
          }
        }
      };

      (window as any).proxyAPI.onWebSocketEvent(eventHandler);

      // Store cleanup function
      this._eventListenerCleanup = () => {
        (window as any).proxyAPI.removeWebSocketEventListener();
      };
    } catch (error) {
      proxyLogger.error('Failed to open connection:', error);
      this._readyState = ProxyWebSocket.CLOSED;

      const errorEvent = new Event('error');
      this.dispatchEvent(errorEvent);
      if (this.onerror) {
        this.onerror(errorEvent);
      }
    }
  }

  send(data: unknown): void {
    if (this._readyState !== ProxyWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    if (!this._id) {
      throw new Error('WebSocket connection ID not available');
    }

    // Convert data for transmission
    let sendData = data;
    if (data instanceof ArrayBuffer) {
      // Convert ArrayBuffer to array for IPC
      sendData = {
        type: 'Buffer',
        data: Array.from(new Uint8Array(data)),
      };
    } else if (data instanceof Uint8Array) {
      // Handle Uint8Array
      sendData = {
        type: 'Buffer',
        data: Array.from(data),
      };
    } else if (typeof data === 'object') {
      sendData = JSON.stringify(data);
    }

    (window as any).proxyAPI.websocketSend({
      id: this._id,
      data: sendData,
    });
  }

  close(code?: number, reason?: string): void {
    if (
      this._readyState === ProxyWebSocket.CLOSING ||
      this._readyState === ProxyWebSocket.CLOSED
    ) {
      return;
    }

    this._readyState = ProxyWebSocket.CLOSING;

    if (this._id) {
      proxyLogger.debug(`Closing connection ${this._id}`);
      (window as any).proxyAPI.websocketClose({
        id: this._id,
        code,
        reason,
      });
    }

    this._cleanup();
  }

  private _cleanup(): void {
    if (this._eventListenerCleanup) {
      this._eventListenerCleanup();
      this._eventListenerCleanup = null;
    }
  }

  // Event handler properties
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
}

/**
 * Create a ServiceManager that uses proxy connections
 */
export async function createProxyServiceManager(
  baseUrl: string,
  token: string = ''
) {
  proxyLogger.debug(`Creating ServiceManager with baseUrl: ${baseUrl}`);

  // Load the real ServiceManager and ServerConnection at runtime
  const { ServiceManager, ServerConnection } = await loadServiceManager();

  const settings = ServerConnection.makeSettings({
    baseUrl,
    token,
    appUrl: '',
    wsUrl: baseUrl.replace(/^https?/, 'wss'),
    init: {
      cache: 'no-store' as RequestCache,
    },
    fetch: proxyFetch,
    WebSocket: ProxyWebSocket as typeof WebSocket,
    appendToken: true,
  });

  return new ServiceManager({
    serverSettings: settings,
  });
}
