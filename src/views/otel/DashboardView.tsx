/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * DashboardView – Full observability dashboard wrapping OtelLive.
 */

import React from 'react';
import { Box } from '@primer/react';
import { OtelLive } from '../../otel';

export interface DashboardViewProps {
  baseUrl?: string;
  /** WebSocket base URL – passed directly to OtelLive to bypass any Vite proxy. */
  wsBaseUrl?: string;
  token?: string;
  autoRefreshMs?: number;
  defaultSignal?: 'traces' | 'logs' | 'metrics';
  limit?: number;
  /** Callback to receive the signal setter from OtelLive. */
  onSignalRef?: (setter: (s: 'traces' | 'logs' | 'metrics') => void) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  baseUrl = '',
  wsBaseUrl,
  token,
  autoRefreshMs = 5000,
  defaultSignal = 'traces',
  limit = 200,
  onSignalRef,
}) => (
  <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
    <OtelLive
      baseUrl={baseUrl}
      wsBaseUrl={wsBaseUrl}
      token={token}
      autoRefreshMs={autoRefreshMs}
      defaultSignal={defaultSignal}
      limit={limit}
      onSignalRef={onSignalRef}
    />
  </Box>
);
