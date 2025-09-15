/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/utils/login
 * @description Login form validation and credential utilities.
 */

import { LoginFormData } from '../../shared/types';

/**
 * Validates login form data.
 * @param data - The login form data to validate
 * @returns Validation result with success status and error message
 */
export const validateLoginForm = (formData: LoginFormData): string => {
  if (!formData.runUrl || !formData.token) {
    return 'Please provide both Run URL and Token';
  }
  return '';
};

/**
 * Gets the default run URL for the login form
 */
export const getDefaultRunUrl = (): string => {
  return 'https://prod1.datalayer.run';
};

/**
 * Formats error messages for display
 */
export const formatLoginError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  return 'Failed to login. Please check your credentials.';
};
