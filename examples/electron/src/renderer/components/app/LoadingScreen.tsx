/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { ThemeProvider, BaseStyles } from '@primer/react';
import { LoadingScreenProps } from '../../../shared/types';
import LoadingSpinner from '../LoadingSpinner';

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isCheckingAuth,
  isReconnecting: _isReconnecting,
}) => {
  return (
    <ThemeProvider>
      <BaseStyles>
        <LoadingSpinner
          variant="fullscreen"
          message={
            isCheckingAuth
              ? 'Checking authentication...'
              : 'Reconnecting to runtimes...'
          }
        />
      </BaseStyles>
    </ThemeProvider>
  );
};

export default LoadingScreen;
