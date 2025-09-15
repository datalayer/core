/**
 * @module renderer/components/environments/EmptyState
 * @description Empty state component when no environments are available.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text } from '@primer/react';

/**
 * Empty state component for when no environments are available.
 * Displays a centered message encouraging users to check their connection.
 * @component
 * @returns Rendered empty state message
 */
const EmptyState: React.FC = () => {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 3,
        bg: 'canvas.subtle',
        borderRadius: 2,
      }}
    >
      <Text sx={{ color: 'fg.muted' }}>
        No environments available. Please check your connection.
      </Text>
    </Box>
  );
};

export default EmptyState;
