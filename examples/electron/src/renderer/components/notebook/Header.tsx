/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module NotebookHeader
 * @description Header component for notebook editor displaying notebook information and runtime controls
 */

import React from 'react';
import { Box, Heading, Text, Button } from '@primer/react';
import { XIcon } from '@primer/octicons-react';
import { NotebookHeaderProps } from '../../../shared/types';

/**
 * Header component for notebook editor that displays notebook metadata and provides runtime management controls.
 * Shows notebook name, description, file path, collaboration status, and terminate runtime button.
 *
 * @component
 * @param props - Component properties
 * @param props.selectedNotebook - The currently selected notebook object
 * @param props.hasCollaboration - Whether real-time collaboration is enabled
 * @param props.isTerminating - Whether runtime termination is in progress
 * @param props.hasServiceManager - Whether service manager is available
 * @param props.onTerminateRuntime - Callback function to terminate the runtime
 * @returns The rendered header component
 */
const Header: React.FC<NotebookHeaderProps> = ({
  selectedNotebook,
  hasCollaboration,
  isTerminating,
  hasServiceManager,
  onTerminateRuntime,
}) => {
  /**
   * Handles keyboard events for the terminate runtime button
   * @param event - The keyboard event
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (
      (event.key === 'Enter' || event.key === ' ') &&
      !isTerminating &&
      hasServiceManager
    ) {
      event.preventDefault();
      onTerminateRuntime();
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'border.default',
        bg: 'canvas.default',
      }}
      role="banner"
      aria-label="Notebook header"
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Heading
            as="h1"
            sx={{
              mb: 1,
              fontSize: 3,
              fontWeight: 'semibold',
              color: 'fg.default',
              wordBreak: 'break-word',
            }}
          >
            {selectedNotebook?.name || 'Jupyter Notebook'}
          </Heading>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Text
              sx={{
                color: 'fg.subtle',
                fontSize: 1,
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}
            >
              {selectedNotebook?.description ||
                'Interactive notebook environment powered by Datalayer'}
            </Text>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              {selectedNotebook?.path && (
                <Text
                  sx={{
                    color: 'fg.muted',
                    fontSize: 0,
                    fontFamily: 'mono',
                    bg: 'canvas.subtle',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'border.subtle',
                  }}
                  title={`File path: ${selectedNotebook.path}`}
                >
                  {selectedNotebook.path}
                </Text>
              )}

              {hasCollaboration && (
                <Text
                  sx={{
                    color: 'success.fg',
                    fontSize: 0,
                    fontWeight: 'semibold',
                    bg: 'success.subtle',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'success.muted',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                  role="status"
                  aria-label="Real-time collaboration is enabled"
                >
                  <Box
                    sx={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      bg: 'success.fg',
                    }}
                    aria-hidden="true"
                  />
                  Real-time collaboration enabled
                </Text>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <Button
            variant="danger"
            size="small"
            onClick={onTerminateRuntime}
            onKeyDown={handleKeyDown}
            disabled={isTerminating || !hasServiceManager}
            leadingVisual={XIcon}
            aria-label={`Terminate runtime for ${selectedNotebook?.name || 'this notebook'}`}
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'white',
                outlineOffset: '-2px',
              },
              '&:disabled': {
                opacity: 0.6,
                cursor: 'not-allowed',
              },
            }}
          >
            {isTerminating ? (
              <Box
                as="span"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  sx={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid',
                    borderColor: 'transparent',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                  aria-hidden="true"
                />
                Terminating...
                <Box
                  as="span"
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
                >
                  Terminating runtime, please wait
                </Box>
              </Box>
            ) : (
              'Terminate Runtime'
            )}
          </Button>
        </Box>
      </Box>

      {!hasServiceManager && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bg: 'attention.subtle',
            border: '1px solid',
            borderColor: 'attention.muted',
            borderRadius: 2,
          }}
          role="alert"
          aria-live="polite"
        >
          <Text sx={{ color: 'attention.fg', fontSize: 1 }}>
            Service manager not available. Please configure Datalayer
            credentials.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default Header;
