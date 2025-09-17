/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module LoadingSpinner
 * @description Loading spinner component specifically for the library page.
 * Wraps the unified LoadingSpinner with library-specific configuration.
 */

import React from 'react';
import UnifiedLoadingSpinner from '../LoadingSpinner';
import { LoadingSpinnerProps } from '../../../shared/types';

/**
 * @component LoadingSpinner
 * @description Displays a loading spinner with custom message for library operations
 * @param {LoadingSpinnerProps} props - The component props
 * @param {string} props.message - Loading message to display
 * @returns {JSX.Element} The rendered loading spinner component
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <UnifiedLoadingSpinner message={message} variant="card" size="medium" />
  );
};

export default LoadingSpinner;
