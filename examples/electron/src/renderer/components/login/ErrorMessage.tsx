/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module ErrorMessage
 * @description Error message component for login form validation and authentication errors.
 * Displays error messages with appropriate accessibility attributes and visual styling.
 */

import React from 'react';
import { Flash } from '@primer/react';
import { LoginErrorProps } from '../../../shared/types';

/**
 * @component ErrorMessage
 * @description Displays login-related error messages with accessibility support
 * @param {LoginErrorProps} props - The component props
 * @param {string | null} props.error - Error message to display
 * @returns {JSX.Element | null} The rendered error message or null if no error
 */
const ErrorMessage: React.FC<LoginErrorProps> = ({ error }) => {
  if (!error) {
    return null;
  }

  return (
    <Flash variant="danger" sx={{ mb: 3 }} role="alert" aria-live="assertive">
      {error}
    </Flash>
  );
};

export default ErrorMessage;
