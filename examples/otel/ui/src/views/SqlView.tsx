/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * SqlView – Standalone SQL query view for the OTEL example app.
 */

import React from 'react';
import { Box } from '@primer/react';
import { OtelSqlView } from '@datalayer/core/otel';

export interface SqlViewProps {
  baseUrl?: string;
  token?: string;
}

export const SqlView: React.FC<SqlViewProps> = ({ baseUrl = '', token }) => (
  <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
    <OtelSqlView baseUrl={baseUrl} token={token} />
  </Box>
);
