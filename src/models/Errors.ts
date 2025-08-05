/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
