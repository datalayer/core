/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module Footer
 * @description Login page footer component with help links and documentation references.
 * Provides users with access to documentation and support resources.
 */

import React from 'react';
import { Box, Text, Button } from '@primer/react';
import { COLORS } from '../../../shared/constants/colors';
import { LoginFooterProps } from '../../../shared/types';

/**
 * @component Footer
 * @description Renders the login page footer with help links
 * @param {LoginFooterProps} props - The component props (currently empty interface)
 * @returns {JSX.Element} The rendered footer component
 */
const Footer: React.FC<LoginFooterProps> = () => {
  return (
    <Box
      as="footer"
      sx={{
        mt: 4,
        pt: 3,
        borderTop: '1px solid',
        borderColor: 'border.muted',
      }}
    >
      <Text sx={{ fontSize: 0, color: 'fg.muted', textAlign: 'center' }}>
        Need help? Visit{' '}
        <Button
          as="a"
          variant="invisible"
          size="small"
          href="https://docs.datalayer.io"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Datalayer documentation (opens in new tab)"
          sx={{
            p: 0,
            fontSize: 0,
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: COLORS.brand.primary,
              outlineOffset: '2px',
              borderRadius: 1,
            },
          }}
        >
          docs.datalayer.io
        </Button>{' '}
        for more information.
      </Text>
    </Box>
  );
};

export default Footer;
