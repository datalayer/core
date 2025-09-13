/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text } from '@primer/react';
import { LoginVersionProps } from '../../../shared/types';

const Version: React.FC<LoginVersionProps> = () => {
  return (
    <Box as="aside" sx={{ mt: 4, textAlign: 'center' }}>
      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Datalayer Electron Example • Version{' '}
        {window.electronAPI ? 'Desktop' : 'Web'}
      </Text>
    </Box>
  );
};

export default Version;
