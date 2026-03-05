/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box } from '@datalayer/primer-addons';
import { OtelSystemView } from '@datalayer/core/otel';

export interface SystemViewProps {
  baseUrl?: string;
  token?: string;
}

export const SystemView: React.FC<SystemViewProps> = ({
  baseUrl = '',
  token,
}) => (
  <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
    <OtelSystemView baseUrl={baseUrl} token={token} />
  </Box>
);
