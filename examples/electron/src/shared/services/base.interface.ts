/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export interface TBaseEvents {
  whenReady: undefined;
}

export interface IBaseService<TEvents = any> {
  whenReady(): Promise<void>;
  registerIPCHandlers(): void;
  on<P extends keyof TEvents>(
    key: P,
    listener: (payload: TEvents[P]) => void
  ): () => void;

  once<P extends keyof TEvents>(
    key: P,
    listener: (payload: TEvents[P]) => void
  ): void;
}
