/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import UnifiedLoadingSpinner from '../LoadingSpinner';

const LoadingSpinner: React.FC = () => {
  return (
    <UnifiedLoadingSpinner
      message="Loading environments..."
      variant="inline"
      sx={{ py: 6 }}
    />
  );
};

export default LoadingSpinner;
