/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * DashboardView – Full observability dashboard wrapping OtelLive.
 */

import React from 'react';
import { Box } from '@primer/react';
import { OtelLive } from '@datalayer/core/otel';

export interface DashboardViewProps {
  baseUrl?: string;
  token?: string;
  autoRefreshMs?: number;
  defaultSignal?: 'traces' | 'logs' | 'metrics';
  limit?: number;
  /** Callback to receive the signal setter from OtelLive. */
  onSignalRef?: (setter: (s: 'traces' | 'logs' | 'metrics') => void) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  baseUrl = '',
  token,
  autoRefreshMs = 5000,
  defaultSignal = 'traces',
  limit = 200,
  onSignalRef,
}) => (
  <Box sx={{ flex: 1, overflow: 'hidden' }}>
    <OtelLive
      baseUrl={baseUrl}
      token={token}
      autoRefreshMs={autoRefreshMs}
      defaultSignal={defaultSignal}
      limit={limit}
      onSignalRef={onSignalRef}
    />
  </Box>
);
