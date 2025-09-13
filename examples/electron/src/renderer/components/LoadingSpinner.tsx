/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, Spinner } from '@primer/react';
import { COLORS } from '../../shared/constants/colors';

export interface LoadingSpinnerProps {
  /** Primary loading message */
  message?: string;
  /** Optional subtext/description */
  subtext?: string;
  /** Size of the spinner */
  size?: 'small' | 'medium' | 'large';
  /** Layout variant */
  variant?: 'default' | 'fullscreen' | 'inline' | 'card';
  /** Additional content to show below the message */
  children?: React.ReactNode;
  /** Custom styles for the container */
  sx?: Record<string, any>;
  /** Hide spinner and only show message */
  hideSpinner?: boolean;
  /** Show as minimal inline loading state */
  minimal?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  subtext,
  size = 'large',
  variant = 'default',
  children,
  sx = {},
  hideSpinner = false,
  minimal = false,
}) => {
  // Minimal variant - just spinner and text inline
  if (minimal) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          ...sx,
        }}
        role="status"
        aria-live="polite"
      >
        {!hideSpinner && (
          <Spinner
            size={size}
            sx={{ color: COLORS.brand.primary }}
            aria-hidden="true"
          />
        )}
        <Text sx={{ color: 'fg.muted' }}>{message}</Text>
      </Box>
    );
  }

  // Container styles based on variant
  const getContainerStyles = () => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    };

    switch (variant) {
      case 'fullscreen':
        return {
          ...baseStyles,
          height: '100vh',
          bg: 'canvas.default',
        };
      case 'inline':
        return {
          ...baseStyles,
          p: 4,
          textAlign: 'center',
        };
      case 'card':
        return {
          ...baseStyles,
          p: 6,
          py: 8,
          textAlign: 'center',
          bg: 'canvas.subtle',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
        };
      default:
        return {
          ...baseStyles,
          p: 4,
          textAlign: 'center',
          height: '100%',
          minHeight: '400px',
        };
    }
  };

  return (
    <Box
      sx={{
        ...getContainerStyles(),
        ...sx,
      }}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {!hideSpinner && (
        <Spinner
          size={size}
          sx={{
            color: COLORS.brand.primary,
            ...(size === 'large' && { width: '48px', height: '48px' }),
          }}
          aria-hidden="true"
        />
      )}

      <Box sx={{ textAlign: 'center' }}>
        <Text
          sx={{
            color: 'fg.default',
            fontSize: size === 'large' ? 2 : 1,
            fontWeight: 'semibold',
            mb: subtext ? 1 : 0,
          }}
        >
          {message}
        </Text>

        {subtext && (
          <Text
            sx={{
              color: 'fg.muted',
              fontSize: size === 'large' ? 1 : 0,
              maxWidth: '400px',
              lineHeight: 1.4,
            }}
          >
            {subtext}
          </Text>
        )}
      </Box>

      {children}

      {/* Screen reader specific information */}
      {subtext && (
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
          {message} - {subtext}
        </Box>
      )}
    </Box>
  );
};

export default LoadingSpinner;
