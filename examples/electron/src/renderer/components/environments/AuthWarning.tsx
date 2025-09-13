/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Flash } from '@primer/react';
import { AlertIcon } from '@primer/octicons-react';

const AuthWarning: React.FC = () => {
  return (
    <Flash variant="warning" sx={{ mb: 3 }}>
      <AlertIcon /> Please login to view and select runtime environments
    </Flash>
  );
};

export default AuthWarning;
