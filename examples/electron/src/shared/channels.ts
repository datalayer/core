/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const CHANNELS = {
  DATALAYER_API: 'datalayer-api',
  WEBSOCKET_PROXY: 'websocket-proxy',
  RUNTIME_MANAGER: 'runtime-manager',
  CONFIG_MANAGER: 'config-manager',
} as const;

export type ChannelKeys = keyof typeof CHANNELS;
export type ChannelValues = (typeof CHANNELS)[ChannelKeys];
