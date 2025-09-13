/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { ThemeProvider, BaseStyles, Box, Spinner, Text } from '@primer/react';
import { COLORS } from '../../constants/colors';
import { LoadingScreenProps } from '../../../shared/types';

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isCheckingAuth,
  isReconnecting: _isReconnecting,
}) => {
  return (
    <ThemeProvider>
      <BaseStyles>
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bg: 'canvas.default',
            gap: 3,
          }}
        >
          <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
          <Text sx={{ color: 'fg.muted' }}>
            {isCheckingAuth
              ? 'Checking authentication...'
              : 'Reconnecting to runtimes...'}
          </Text>
        </Box>
      </BaseStyles>
    </ThemeProvider>
  );
};

export default LoadingScreen;
