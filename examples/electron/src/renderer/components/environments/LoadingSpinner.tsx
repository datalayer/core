/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module LoadingSpinner
 * @description Loading spinner component specifically for environments page.
 * Wraps the unified LoadingSpinner with environment-specific messaging and styling.
 */

import React from 'react';
import UnifiedLoadingSpinner from '../LoadingSpinner';

/**
 * @component LoadingSpinner
 * @description Displays a loading spinner with "Loading environments..." message
 * @returns {JSX.Element} The rendered loading spinner component
 */
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
