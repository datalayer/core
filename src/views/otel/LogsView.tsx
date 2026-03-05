/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * LogsView – Standalone logs-only view.
 * Renders OtelLive defaulting to the logs signal.
 */

import React from 'react';
import { Box } from '@primer/react';
import { OtelLive } from '../../otel';

export interface LogsViewProps {
  baseUrl?: string;
  token?: string;
  autoRefreshMs?: number;
  limit?: number;
}

export const LogsView: React.FC<LogsViewProps> = ({
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
      defaultSignal="logs"
      limit={limit}
    />
  </Box>
);
