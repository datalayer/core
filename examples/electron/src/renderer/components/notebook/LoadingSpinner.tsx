/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module NotebookLoadingSpinner
 * @description Loading spinner component for notebook operations with contextual messages and accessibility support
 */

import React from 'react';
import { Box, Text, Spinner } from '@primer/react';
import { COLORS } from '../../../shared/constants/colors';
import { NotebookLoadingStateProps } from '../../../shared/types';

/**
 * Loading spinner component that displays contextual loading messages for various notebook operations.
 * Provides accessibility support and different messages based on the type of loading operation.
 *
 * @component
 * @param props - Component properties
 * @param props.loading - General loading state
 * @param props.loadingNotebook - Whether notebook content is being loaded
 * @param props.isCreatingRuntime - Whether runtime environment is being created
 * @param props.message - Custom loading message to display
 * @returns The rendered loading spinner component or null if not loading
 */
const LoadingSpinner: React.FC<NotebookLoadingStateProps> = ({
  loading,
  loadingNotebook,
  isCreatingRuntime,
  message,
}) => {
  // Don't render if not loading
  if (!loading && !loadingNotebook && !isCreatingRuntime) {
    return null;
  }

  /**
   * Determines the appropriate loading message based on the current loading state
   * @returns The loading message to display
   */
  const getLoadingMessage = (): string => {
    if (message) {
      return message;
    }

    if (loadingNotebook) {
      return 'Loading notebook...';
    }

    if (isCreatingRuntime) {
      return 'Creating runtime environment...';
    }

    return 'Loading notebook environment...';
  };

  /**
   * Provides additional context about the current loading operation
   * @returns The subtext message to display
   */
  const getLoadingSubtext = (): string => {
    if (loadingNotebook) {
      return 'Fetching notebook content from server';
    }

    if (isCreatingRuntime) {
      return 'Setting up compute environment for execution';
    }

    return 'Initializing Jupyter services and runtime';
  };

  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: '100%',
        minHeight: '400px',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading notebook"
    >
      <Spinner
        size="large"
        sx={{
          color: COLORS.brand.primary,
          width: '48px',
          height: '48px',
        }}
        aria-hidden="true"
      />

      <Box sx={{ textAlign: 'center' }}>
        <Text
          sx={{
            color: 'fg.default',
            fontSize: 2,
            fontWeight: 'semibold',
            display: 'block',
          }}
        >
          {getLoadingMessage()}
        </Text>
      </Box>

      <Text
        sx={{
          color: 'fg.muted',
          fontSize: 1,
          maxWidth: '400px',
          lineHeight: 1.4,
          textAlign: 'center',
          mt: -2,
        }}
      >
        {getLoadingSubtext()}
      </Text>

      {/* Screen reader specific information */}
      <Box
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        }}
        aria-live="polite"
      >
        {getLoadingMessage()} - {getLoadingSubtext()}
      </Box>
    </Box>
  );
};

export default LoadingSpinner;
