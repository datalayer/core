/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/components/document/LoadingSpinner
 * @description Loading spinner component for document editor states.
 */

import React from 'react';
import { DocumentLoadingStateProps } from '../../../shared/types';
import UnifiedLoadingSpinner from '../LoadingSpinner';

/**
 * Loading spinner component specific to document editor operations.
 * Displays contextual loading messages based on document editor state.
 * @component
 * @param props - Component props
 * @param props.isCreatingRuntime - Whether a runtime is being created
 * @param props.loading - Generic loading state (unused in current implementation)
 * @param props.serviceManager - Jupyter service manager instance
 * @returns Rendered loading spinner with appropriate message
 */
const LoadingSpinner: React.FC<DocumentLoadingStateProps> = ({
  isCreatingRuntime,
  loading: _loading,
  serviceManager,
}) => {
  let message = 'Loading document...';

  if (isCreatingRuntime) {
    message = 'Creating runtime environment...';
  } else if (!serviceManager) {
    message = 'Loading document...';
  } else {
    message = 'Preparing kernel environment...';
  }

  return <UnifiedLoadingSpinner message={message} variant="default" />;
};

export default LoadingSpinner;
