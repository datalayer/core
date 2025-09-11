/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { dialog } from 'electron';
import log from 'electron-log/main';
import { sendNotification } from './util';

export interface ErrorHandlerOptions {
  showDialog?: boolean;
  showNotification?: boolean;
  logLevel?: 'error' | 'warn' | 'info';
}

export function handleError(
  error: Error | string,
  showUserDialog: boolean = false,
  options: ErrorHandlerOptions = {}
): void {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  // Log the error
  const logLevel = options.logLevel || 'error';
  log[logLevel]('Error occurred:', errorMessage);
  if (errorStack) {
    log[logLevel]('Stack trace:', errorStack);
  }

  // Show notification to user
  if (options.showNotification !== false) {
    sendNotification({
      message: `Error: ${errorMessage}`,
      type: 'error',
    });
  }

  // Show dialog if requested
  if (showUserDialog || options.showDialog) {
    dialog.showErrorBox('Application Error', errorMessage);
  }
}

export function initMainErrorHandler(): void {
  process.on('uncaughtException', error => {
    log.error('Uncaught Exception:', error);
    handleError(error, true);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
    handleError(new Error(`Unhandled Promise Rejection: ${reason}`), false);
  });
}
