/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TracesView – Standalone traces-only view.
 * Renders OtelLive defaulting to the traces signal.
 */

import React from 'react';
import { Box } from '@primer/react';
import { OtelLive } from '../../otel';

export interface TracesViewProps {
  baseUrl?: string;
  token?: string;
  autoRefreshMs?: number;
  limit?: number;
}

export const TracesView: React.FC<TracesViewProps> = ({
  baseUrl = '',
  token,
  autoRefreshMs = 5000,
  limit = 200,
}) => (
  <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
    <OtelLive
      baseUrl={baseUrl}
      token={token}
      autoRefreshMs={autoRefreshMs}
      defaultSignal="traces"
      limit={limit}
    />
  </Box>
);
