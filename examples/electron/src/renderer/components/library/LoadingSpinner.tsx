/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, Spinner } from '@primer/react';
import { COLORS } from '../../constants/colors';
import { LoadingSpinnerProps } from '../../../shared/types';

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <Box
      sx={{
        p: 6,
        py: 8,
        textAlign: 'center',
        bg: 'canvas.subtle',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
      }}
    >
      <Spinner size="medium" sx={{ color: COLORS.brand.primary }} />
      <Text sx={{ mt: 2, display: 'block', color: 'fg.muted' }}>{message}</Text>
    </Box>
  );
};

export default LoadingSpinner;
