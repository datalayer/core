/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module Version
 * @description Version display component for the login page.
 * Shows application version information and platform detection (Desktop vs Web).
 */

import React from 'react';
import { Box, Text } from '@primer/react';
import { LoginVersionProps } from '../../../shared/types';

/**
 * @component Version
 * @description Displays version information at the bottom of the login page
 * @param {LoginVersionProps} props - The component props (currently empty interface)
 * @returns {JSX.Element} The rendered version information component
 */
const Version: React.FC<LoginVersionProps> = () => {
  return (
    <Box as="aside" sx={{ mt: 4, textAlign: 'center' }}>
      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Datalayer Desktop • Version {window.electronAPI ? 'Desktop' : 'Web'}
      </Text>
    </Box>
  );
};

export default Version;
