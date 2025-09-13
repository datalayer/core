/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Spinner, Text } from '@primer/react';
import { DocumentLoadingStateProps } from '../../../shared/types';
import { COLORS } from '../../constants/colors';

const LoadingState: React.FC<DocumentLoadingStateProps> = ({
  isCreatingRuntime,
  loading: _loading,
  serviceManager,
}) => {
  let message = 'Loading document...';

  if (isCreatingRuntime) {
    message = 'Creating runtime environment...';
  } else if (!serviceManager) {
    message = 'Loading document...';
  } else {
    message = 'Preparing kernel environment...';
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: '100%',
      }}
    >
      <Spinner size="large" sx={{ color: COLORS.brand.primary }} />
      <Text sx={{ color: 'fg.muted' }}>{message}</Text>
    </Box>
  );
};

export default LoadingState;