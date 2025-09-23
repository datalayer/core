/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/utils/validation
 * @description Utility functions for API parameter validation
 */

/**
 * Validates that an authentication token is provided and not empty
 * @param token - The authentication token to validate
 * @throws {Error} If the token is missing, null, undefined, or empty/whitespace
 */
export const validateToken = (token: string | undefined | null): void => {
  if (!token || !token.trim()) {
    throw new Error('Authentication token is required');
  }
};

/**
 * Validates that a required parameter is provided
 * @param value - The value to validate
 * @param paramName - The name of the parameter for error messages
 * @throws {Error} If the value is missing, null, or undefined
 */
export const validateRequired = (value: any, paramName: string): void => {
  if (value === null || value === undefined) {
    throw new Error(`${paramName} is required`);
  }
};

/**
 * Validates that a string parameter is provided and not empty
 * @param value - The string value to validate
 * @param paramName - The name of the parameter for error messages
 * @throws {Error} If the value is missing, null, undefined, or empty/whitespace
 */
export const validateRequiredString = (
  value: string | undefined | null,
  paramName: string,
): void => {
  if (!value || !value.trim()) {
    throw new Error(`${paramName} is required`);
  }
};
