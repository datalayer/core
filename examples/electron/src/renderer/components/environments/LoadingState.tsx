/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, Spinner } from '@primer/react';
import { COLORS } from '../../constants/colors';

const LoadingState: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 6,
        gap: 2,
      }}
    >
      <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
      <Text sx={{ color: 'fg.muted' }}>Loading environments...</Text>
    </Box>
  );
};

export default LoadingState;
