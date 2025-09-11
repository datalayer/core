/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { BrowserWindow } from 'electron';
import log from 'electron-log/main';

/**
 * Environment detection utilities
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function shouldEnableDevTools(): boolean {
  return true; // Always enable DevTools as per original code
}

export function shouldUseProductionSecurity(): boolean {
  return !isDevelopmentMode();
}

/**
 * Broadcast message to all browser windows
 */
export function broadcastMessage(channel: string, data: any): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    if (!window.isDestroyed()) {
      try {
        window.webContents.send(channel, data);
      } catch (error) {
        log.error(`Failed to broadcast message to window: ${error}`);
      }
    }
  });
}

/**
 * Send notification to renderer
 */
export function sendNotification(notification: {
  message: string;
  type: 'info' | 'error' | 'warning';
}): void {
  broadcastMessage('notification', notification);
}

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Remove browser listeners
 */
export function removeBrowserListeners(): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => {
    if (!window.isDestroyed()) {
      window.removeAllListeners();
    }
  });
}

/**
 * Get user data path
 */
export function getUserDataPath(): string {
  return (
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? process.env.HOME + '/Library/Application Support'
      : process.env.HOME + '/.local/share')
  );
}
