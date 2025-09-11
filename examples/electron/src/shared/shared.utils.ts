/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Utility function to create channel keys for IPC communication
 */
export function getChannelKey(channel: string, key: string): string {
  return `${channel}:${key}`;
}
