/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module Button
 * @description Login button component with loading states and accessibility features.
 * Provides visual feedback during authentication and includes comprehensive screen reader support.
 */

import React from 'react';
import { Box, Button as PrimerButton } from '@primer/react';
import { CheckIcon } from '@primer/octicons-react';
import { COLORS } from '../../../shared/constants/colors';
import { LoginButtonProps } from '../../../shared/types';

/**
 * @component Button
 * @description Renders the login/connect button with loading and disabled states
 * @param {LoginButtonProps} props - The component props
 * @param {boolean} props.loading - Whether authentication is in progress
 * @param {boolean} props.disabled - Whether the button should be disabled
 * @param {function} props.onClick - Handler for button clicks
 * @returns {JSX.Element} The rendered login button component
 */
const Button: React.FC<LoginButtonProps> = ({ loading, disabled, onClick }) => {
  return (
    <>
      <PrimerButton
        type="submit"
        size="large"
        block
        onClick={onClick}
        disabled={disabled}
        aria-describedby="connect-button-help"
        sx={{
          backgroundColor: COLORS.brand.primary,
          '&:hover': { backgroundColor: COLORS.brand.primaryHover },
          '&:disabled': { opacity: 0.5 },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'white',
            outlineOffset: '-2px',
          },
          color: 'white',
        }}
      >
        {loading ? (
          <>
            <Box as="span" aria-hidden="true">
              Connecting...
            </Box>
            <Box
              as="span"
              style={{
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
              Authenticating with Datalayer, please wait
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon aria-hidden="true" size={16} />
            Connect
          </Box>
        )}
      </PrimerButton>
      <div
        id="connect-button-help"
        style={{
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
        {disabled
          ? 'Complete both URL and token fields to enable connection'
          : 'Submit form to authenticate with Datalayer'}
      </div>
    </>
  );
};

export default Button;
