/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module Header
 * @description Login page header component with logo and title.
 * Displays the Datalayer logo, application title, and login description.
 */

import React from 'react';
import { Box, Heading, Text } from '@primer/react';
import { LoginHeaderProps } from '../../../shared/types';

/**
 * @component Header
 * @description Renders the login page header with logo and title
 * @param {LoginHeaderProps} props - The component props
 * @param {string} props.iconSrc - Source URL for the application icon
 * @returns {JSX.Element} The rendered header component
 */
const Header: React.FC<LoginHeaderProps> = ({ iconSrc }) => {
  return (
    <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
      <Box
        sx={{
          width: 80,
          height: 80,
          margin: '0 auto',
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={iconSrc}
          alt="Datalayer application logo"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            objectFit: 'cover',
          }}
        />
      </Box>
      <Heading as="h1" id="login-heading" sx={{ mb: 1, fontSize: 4 }}>
        Connect to Datalayer
      </Heading>
      <Text id="login-description" sx={{ color: 'fg.subtle' }}>
        Enter your Datalayer credentials to access cloud resources
      </Text>
    </header>
  );
};

export default Header;
