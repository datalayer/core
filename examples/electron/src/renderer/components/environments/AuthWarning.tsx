/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/components/environments/AuthWarning
 * @description Warning component displayed when user is not authenticated.
 */

import React from 'react';
import { Flash } from '@primer/react';
import { AlertIcon } from '@primer/octicons-react';

/**
 * Authentication warning component.
 * Displays a warning message when the user needs to login to view environments.
 * @component
 * @returns Rendered warning flash message
 */
const AuthWarning: React.FC = () => {
  return (
    <Flash variant="warning" sx={{ mb: 3 }}>
      <AlertIcon /> Please login to view and select runtime environments
    </Flash>
  );
};

export default AuthWarning;
