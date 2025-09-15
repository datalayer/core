/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { ThemeProvider, BaseStyles } from '@primer/react';
import { LoadingScreenProps } from '../../../shared/types';
import LoadingSpinner from '../LoadingSpinner';
import { PreloadState } from '../../hooks/usePreload';

interface ExtendedLoadingScreenProps extends LoadingScreenProps {
  isPreloading?: boolean;
  preloadStates?: Record<string, PreloadState>;
}

const LoadingScreen: React.FC<ExtendedLoadingScreenProps> = ({
  isCheckingAuth,
  isReconnecting,
  isPreloading,
}) => {
  const getMessage = () => {
    if (isCheckingAuth) return 'Checking authentication...';
    if (isReconnecting) return 'Reconnecting to runtimes...';
    if (isPreloading) return 'Loading components...';
    return 'Initializing...';
  };

  return (
    <ThemeProvider>
      <BaseStyles>
        <LoadingSpinner variant="fullscreen" message={getMessage()} />
      </BaseStyles>
    </ThemeProvider>
  );
};

export default LoadingScreen;
