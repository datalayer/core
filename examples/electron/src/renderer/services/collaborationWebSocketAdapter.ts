/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module CollaborationWebSocketAdapter
 * @description WebSocket adapter for real-time collaboration that bridges between LoroCollaborativePlugin and Electron's IPC-based WebSocket proxy
 */

import { logger } from '../utils/logger';

/**
 * Configuration options for CollaborationWebSocketAdapter
 * @interface
 */
interface CollaborationWebSocketOptions {
  docId: string;
  spacerRunUrl: string;
  token: string;
  runtimeId?: string;
}

/**
 * WebSocket adapter for collaboration that bridges between LoroCollaborativePlugin
 * and Electron's IPC-based WebSocket proxy system. Manages real-time collaborative
 * editing connections through Electron's proxy API.
 */
export class CollaborationWebSocketAdapter {
  private docId: string;
  private websocketUrl: string;
  private token: string;
  private runtimeId: string;
  private connectionId: string | null = null;
  private isConnected = false;
  private messageHandlers: Set<(event: MessageEvent) => void> = new Set();
  private errorHandlers: Set<(error: Event) => void> = new Set();
  private closeHandlers: Set<(event: CloseEvent) => void> = new Set();
  private openHandlers: Set<(event: Event) => void> = new Set();

  /**
   * Creates a new CollaborationWebSocketAdapter instance
   * @param options - Configuration options for the adapter
   */
  constructor(options: CollaborationWebSocketOptions) {
    this.docId = options.docId;
    this.token = options.token;
    this.runtimeId = options.runtimeId || `collaboration-${options.docId}`;

    // Convert HTTP to WebSocket URL and construct collaboration endpoint
    this.websocketUrl = `${options.spacerRunUrl.replace(/^http/, 'ws')}/api/spacer/v1/lexical/ws/${options.docId}`;

    logger.debug(
      `[CollaborationAdapter] Created for document ${this.docId} with URL: ${this.websocketUrl}`
    );
  }

  /**
   * Connect to collaboration WebSocket through Electron proxy
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.connectionId) {
      logger.warn(
        `[CollaborationAdapter] Already connected (ID: ${this.connectionId})`
      );
      return;
    }

    // RACE CONDITION PREVENTION: Check if runtime is terminated before creating WebSocket connection
    if (this.runtimeId) {
      const cleanupRegistry = (window as any).__datalayerRuntimeCleanup;
      if (
        cleanupRegistry &&
        cleanupRegistry.has(this.runtimeId) &&
        cleanupRegistry.get(this.runtimeId).terminated
      ) {
        logger.info(
          '[CollaborationWebSocketAdapter] 🛑 RACE CONDITION PREVENTION: Blocking WebSocket connection for terminated runtime:',
          this.runtimeId
        );
        throw new Error(
          `Runtime ${this.runtimeId} has been terminated - no new collaboration connections allowed`
        );
      }
    }

    try {
      logger.debug(
        `[CollaborationAdapter] Connecting to collaboration WebSocket for document ${this.docId}`
      );

      const result = await (window as any).proxyAPI.websocketOpen({
        url: this.websocketUrl,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        runtimeId: this.runtimeId,
      });

      this.connectionId = result.id;
      logger.debug(
        `[CollaborationAdapter] Connected with ID: ${this.connectionId}`
      );

      // Set up event listener for WebSocket events from main process
      this.setupEventListeners();

      this.isConnected = true;

      // Trigger open event handlers
      const openEvent = new Event('open');
      this.openHandlers.forEach(handler => handler(openEvent));
    } catch (error) {
      logger.error(`[CollaborationAdapter] Failed to connect:`, error);

      // Trigger error event handlers
      const errorEvent = new Event('error');
      this.errorHandlers.forEach(handler => handler(errorEvent));

      throw error;
    }
  }

  /**
   * Send message through WebSocket
   */
  async send(data: string | ArrayBuffer | Blob): Promise<void> {
    if (!this.connectionId || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    try {
      await (window as any).proxyAPI.websocketSend({
        id: this.connectionId,
        data: data,
      });

      logger.debug(
        `[CollaborationAdapter] Sent message to ${this.connectionId}`
      );
    } catch (error) {
      logger.error(`[CollaborationAdapter] Failed to send message:`, error);
      throw error;
    }
  }

  /**
   * Close WebSocket connection
   */
  async close(code?: number, reason?: string): Promise<void> {
    if (!this.connectionId) {
      logger.warn(`[CollaborationAdapter] No connection to close`);
      return;
    }

    try {
      logger.debug(
        `[CollaborationAdapter] Closing connection ${this.connectionId}`
      );

      await (window as any).proxyAPI.websocketClose({
        id: this.connectionId,
        code,
        reason,
      });

      this.cleanup();

      // Trigger close event handlers
      const closeEvent = new CloseEvent('close', {
        code: code || 1000,
        reason: reason || 'Normal closure',
      });
      this.closeHandlers.forEach(handler => handler(closeEvent));
    } catch (error) {
      logger.error(`[CollaborationAdapter] Failed to close connection:`, error);
    }
  }

  /**
   * Add event listener (WebSocket-like API)
   */
  addEventListener(type: string, listener: (event: any) => void): void {
    switch (type) {
      case 'message':
        this.messageHandlers.add(listener);
        break;
      case 'error':
        this.errorHandlers.add(listener);
        break;
      case 'close':
        this.closeHandlers.add(listener);
        break;
      case 'open':
        this.openHandlers.add(listener);
        break;
      default:
        logger.warn(`[CollaborationAdapter] Unknown event type: ${type}`);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: string, listener: (event: any) => void): void {
    switch (type) {
      case 'message':
        this.messageHandlers.delete(listener);
        break;
      case 'error':
        this.errorHandlers.delete(listener);
        break;
      case 'close':
        this.closeHandlers.delete(listener);
        break;
      case 'open':
        this.openHandlers.delete(listener);
        break;
      default:
        logger.warn(`[CollaborationAdapter] Unknown event type: ${type}`);
    }
  }

  /**
   * WebSocket-like properties
   */
  get readyState(): number {
    if (!this.connectionId) return WebSocket.CLOSED;
    return this.isConnected ? WebSocket.OPEN : WebSocket.CONNECTING;
  }

  get url(): string {
    return this.websocketUrl;
  }

  /**
   * Set up event listeners for WebSocket events from main process
   */
  private setupEventListeners(): void {
    (window as any).proxyAPI.onWebSocketEvent?.(
      (event: {
        id: string;
        type: 'message' | 'error' | 'close';
        data?: any;
        error?: string;
        code?: number;
        reason?: string;
      }) => {
        // Only handle events for our connection
        if (event.id !== this.connectionId) return;

        logger.debug(
          `[CollaborationAdapter] Received ${event.type} event for ${event.id}`
        );

        switch (event.type) {
          case 'message': {
            const messageEvent = new MessageEvent('message', {
              data: event.data,
            });
            this.messageHandlers.forEach(handler => handler(messageEvent));
            break;
          }

          case 'error': {
            this.isConnected = false;
            const errorEvent = new Event('error');
            this.errorHandlers.forEach(handler => handler(errorEvent));
            break;
          }

          case 'close': {
            this.cleanup();
            const closeEvent = new CloseEvent('close', {
              code: event.code || 1000,
              reason: event.reason || 'Connection closed',
            });
            this.closeHandlers.forEach(handler => handler(closeEvent));
            break;
          }
        }
      }
    );
  }

  /**
   * Clean up internal state
   */
  private cleanup(): void {
    this.isConnected = false;
    this.connectionId = null;
  }

  /**
   * Static factory method to create and connect adapter
   */
  static async create(
    options: CollaborationWebSocketOptions
  ): Promise<CollaborationWebSocketAdapter> {
    const adapter = new CollaborationWebSocketAdapter(options);
    await adapter.connect();
    return adapter;
  }
}
