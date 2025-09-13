/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text } from '@primer/react';
import { NotebookErrorBoundaryProps } from '../../../shared/types';

class ErrorBoundary extends React.Component<
  NotebookErrorBoundaryProps,
  { hasError: boolean; errorInfo: string | null }
> {
  constructor(props: NotebookErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorInfo: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      '[NotebookErrorBoundary] Caught notebook error:',
      error,
      errorInfo
    );

    // Log specific error types for better debugging
    if (error.message.includes('Disposed')) {
      console.info(
        '[NotebookErrorBoundary] SessionContext disposal error - likely component lifecycle issue'
      );
    } else if (error.message.includes('removeChild')) {
      console.info(
        '[NotebookErrorBoundary] DOM manipulation error - component mounting/unmounting conflict'
      );
    } else if (error.message.includes('MathJax')) {
      console.info(
        '[NotebookErrorBoundary] MathJax rendering conflict detected'
      );
    } else if (error.message.includes('collaboration')) {
      console.info(
        '[NotebookErrorBoundary] Collaboration provider error detected'
      );
    }

    this.props.onError(error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bg: 'canvas.subtle',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            m: 2,
          }}
          role="alert"
          aria-live="assertive"
        >
          <Text
            sx={{
              color: 'danger.fg',
              mb: 2,
              fontSize: 2,
              fontWeight: 'semibold',
            }}
          >
            Notebook component encountered an error
          </Text>

          <Text sx={{ color: 'fg.muted', fontSize: 1, mb: 3 }}>
            This may be due to collaboration state conflicts, component
            lifecycle issues, or rendering conflicts.
          </Text>

          {this.state.errorInfo && (
            <Box
              sx={{
                bg: 'canvas.inset',
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'border.subtle',
                mb: 3,
              }}
            >
              <Text
                sx={{
                  fontFamily: 'mono',
                  fontSize: 0,
                  color: 'fg.muted',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.errorInfo}
              </Text>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Text
              sx={{
                color: 'accent.fg',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 1,
                '&:hover': {
                  color: 'accent.emphasis',
                },
                '&:focus': {
                  outline: '2px solid',
                  outlineColor: 'accent.fg',
                  outlineOffset: '2px',
                },
              }}
              onClick={this.handleReset}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this.handleReset();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Reset notebook component and try again"
            >
              Reset notebook
            </Text>

            <Text sx={{ color: 'fg.muted', fontSize: 1 }}>•</Text>

            <Text
              sx={{
                color: 'accent.fg',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 1,
                '&:hover': {
                  color: 'accent.emphasis',
                },
                '&:focus': {
                  outline: '2px solid',
                  outlineColor: 'accent.fg',
                  outlineOffset: '2px',
                },
              }}
              onClick={() => window.location.reload()}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  window.location.reload();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Refresh the entire page"
            >
              Refresh page
            </Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
