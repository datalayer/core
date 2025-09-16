/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/components/app/LoadingScreen
 * @description Full-screen loading indicator component with status messages.
 */

import React from 'react';
import { ThemeProvider, BaseStyles } from '@primer/react';
import { LoadingScreenProps } from '../../../shared/types';
import LoadingSpinner from '../LoadingSpinner';
import { PreloadState } from '../../hooks/usePreload';

/**
 * Extended loading screen props with preload state.
 * @interface ExtendedLoadingScreenProps
 * @extends LoadingScreenProps
 */
interface ExtendedLoadingScreenProps extends LoadingScreenProps {
  /** Whether components are being preloaded */
  isPreloading?: boolean;
  /** States of individual preload operations */
  preloadStates?: Record<string, PreloadState>;
}

/**
 * Full-screen loading component shown during app initialization.
 * Displays different messages based on current loading state.
 * @component
 * @param props - Component props
 * @param props.isCheckingAuth - Whether authentication is being checked
 * @param props.isReconnecting - Whether reconnecting to existing runtimes
 * @param props.isPreloading - Whether preloading components
 * @returns Rendered loading screen
 */
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
