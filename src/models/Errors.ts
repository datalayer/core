/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Error emitted when the user tries to create more runtimes than allowed.
 */
export class MaxRuntimesExceededError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MaxRuntimesExceededError';
  }
}
