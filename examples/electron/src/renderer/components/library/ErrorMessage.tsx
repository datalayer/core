/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module ErrorMessage
 * @description Simple component for displaying error and warning messages in the library.
 * Renders Flash components with appropriate variants and icons for error and warning states.
 */

import React from 'react';
import { Flash } from '@primer/react';
import { AlertIcon } from '@primer/octicons-react';
import { ErrorMessageProps } from '../../../shared/types';

/**
 * @component ErrorMessage
 * @description Displays error and/or warning messages using Flash components
 * @param {ErrorMessageProps} props - The component props
 * @param {string | null} props.error - Error message to display as danger flash
 * @param {string | null} props.warning - Warning message to display as warning flash
 * @returns {JSX.Element} The rendered error/warning messages
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, warning }) => {
  return (
    <>
      {error && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          {error}
        </Flash>
      )}

      {warning && (
        <Flash variant="warning" sx={{ mb: 3 }}>
          <AlertIcon /> {warning}
        </Flash>
      )}
    </>
  );
};

export default ErrorMessage;
