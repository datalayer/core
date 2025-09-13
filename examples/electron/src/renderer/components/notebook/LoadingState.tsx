/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, Spinner } from '@primer/react';
import { COLORS } from '../../constants/colors';
import { NotebookLoadingStateProps } from '../../../shared/types';

const LoadingState: React.FC<NotebookLoadingStateProps> = ({
  loading,
  loadingNotebook,
  isCreatingRuntime,
  message,
}) => {
  // Don't render if not loading
  if (!loading && !loadingNotebook && !isCreatingRuntime) {
    return null;
  }

  // Determine the appropriate loading message
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
            mb: 1,
          }}
        >
          {getLoadingMessage()}
        </Text>

        <Text
          sx={{
            color: 'fg.muted',
            fontSize: 1,
            maxWidth: '400px',
            lineHeight: 1.4,
          }}
        >
          {getLoadingSubtext()}
        </Text>
      </Box>

      {isCreatingRuntime && (
        <Box
          sx={{
            bg: 'canvas.subtle',
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.subtle',
            maxWidth: '500px',
          }}
        >
          <Text
            sx={{
              color: 'fg.muted',
              fontSize: 0,
              textAlign: 'left',
              fontFamily: 'mono',
            }}
          >
            • Allocating compute resources
            <br />
            • Starting Jupyter server
            <br />
            • Configuring kernel environment
            <br />• Establishing secure connections
          </Text>
        </Box>
      )}

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

export default LoadingState;