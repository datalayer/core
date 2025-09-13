/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Heading, Text } from '@primer/react';
import { LoginHeaderProps } from '../../../shared/types';

const Header: React.FC<LoginHeaderProps> = ({ iconSrc }) => {
  return (
    <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <Box
        sx={{
          width: 96,
          height: 96,
          margin: '0 auto',
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={iconSrc}
          alt="Datalayer application logo"
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '20px',
            objectFit: 'cover',
          }}
        />
      </Box>
      <Heading as="h1" id="login-heading" sx={{ mb: 2 }}>
        Connect to Datalayer
      </Heading>
      <Text id="login-description" sx={{ color: 'fg.subtle' }}>
        Enter your Datalayer credentials to access cloud resources
      </Text>
    </header>
  );
};

export default Header;
