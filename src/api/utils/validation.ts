/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Utility functions for API parameter validation
 *
 * @module api/utils/validation
 */

/**
 * Validates that an authentication token is provided and is a valid JWT format
 * @param token - The authentication token to validate
 * @throws {Error} If the token is missing, null, undefined, empty/whitespace, or not a valid JWT format
 */
export const validateToken = (token: string | undefined | null): void => {
  // Check if token exists and is not empty
  if (!token || !token.trim()) {
    throw new Error('Authentication token is required');
  }

  const trimmedToken = token.trim();

  // JWT should have three parts separated by dots (header.payload.signature)
  const parts = trimmedToken.split('.');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid token format: JWT must have three parts separated by dots',
    );
  }

  // Check each part is Base64URL encoded (contains only valid characters)
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Each part should not be empty
    if (!part || part.length === 0) {
      throw new Error(`Invalid token format: Part ${i + 1} is empty`);
    }

    // Check for valid Base64URL characters
    if (!base64UrlRegex.test(part)) {
      throw new Error(
        `Invalid token format: Part ${i + 1} contains invalid characters`,
      );
    }
  }

  // Check reasonable length constraints
  // JWT tokens are typically 100-2000 characters depending on claims
  if (trimmedToken.length < 100) {
    throw new Error(
      'Invalid token format: Token is too short to be a valid JWT',
    );
  }

  if (trimmedToken.length > 5000) {
    throw new Error(
      'Invalid token format: Token exceeds maximum expected length',
    );
  }

  // Validate header structure (should be valid base64url JSON)
  try {
    // Use Buffer for Node.js compatibility or atob for browser
    const headerBase64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const headerString =
      typeof Buffer !== 'undefined'
        ? Buffer.from(headerBase64, 'base64').toString()
        : atob(headerBase64);
    const header = JSON.parse(headerString);

    // Check for required JWT header fields
    if (!header.alg) {
      throw new Error('Invalid token format: Missing algorithm in JWT header');
    }

    if (!header.typ && !header.cty) {
      // typ is optional but common, if missing there should be at least some type indication
      console.warn('JWT header missing "typ" field, which is recommended');
    }
  } catch (e) {
    if (
      e instanceof Error &&
      e.message === 'Invalid token format: Missing algorithm in JWT header'
    ) {
      throw e;
    }
    throw new Error(
      'Invalid token format: JWT header is not valid base64-encoded JSON',
    );
  }

  // Validate payload structure (should be valid base64url JSON)
  try {
    // Use Buffer for Node.js compatibility or atob for browser
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadString =
      typeof Buffer !== 'undefined'
        ? Buffer.from(payloadBase64, 'base64').toString()
        : atob(payloadBase64);
    const payload = JSON.parse(payloadString);

    // Check for common JWT claims (at least one should typically be present)
    const commonClaims = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'];
    const hasCommonClaim = commonClaims.some(
      claim => payload[claim] !== undefined,
    );

    if (!hasCommonClaim) {
      console.warn(
        'JWT payload missing common claims, token may be non-standard',
      );
    }

    // If exp (expiration) exists, check if token is expired
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token has expired');
      }
    }

    // If nbf (not before) exists, check if token is not yet valid
    if (payload.nbf) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.nbf > now) {
        throw new Error('Token is not yet valid');
      }
    }
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'Token has expired' ||
        e.message === 'Token is not yet valid')
    ) {
      throw e;
    }
    throw new Error(
      'Invalid token format: JWT payload is not valid base64-encoded JSON',
    );
  }

  // Signature part validation (just check it exists and has reasonable length)
  if (parts[2].length < 20) {
    throw new Error('Invalid token format: JWT signature is too short');
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

/**
 * Validates that all properties in an object are defined (not undefined).
 * Recursively checks nested objects and arrays to ensure complete data integrity.
 * This is used to validate model toJSON() outputs and ensure Client contract compliance.
 *
 * @param obj - The object to validate
 * @param modelName - Name of the model class for error messages (e.g., 'Runtime')
 * @param path - Current property path for recursive validation (internal use)
 * @throws {Error} If any property value is undefined, with full path to the undefined property
 *
 * @example
 * ```typescript
 * const runtimeData = {
 *   uid: 'abc123',
 *   podName: 'my-pod',
 *   environmentName: undefined  // This will throw
 * };
 * validateJSON(runtimeData, 'Runtime');
 * // Error: Runtime.toJSON(): Property 'environmentName' is undefined
 * ```
 */
export const validateJSON = (
  obj: Record<string, any>,
  modelName: string,
  path: string = '',
): void => {
  // Iterate over all enumerable properties
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }

    const value = obj[key];
    const currentPath = path ? `${path}.${key}` : key;

    // Check if value is undefined - this is the error case
    if (value === undefined) {
      throw new Error(
        `${modelName}.toJSON(): Property '${currentPath}' is undefined`,
      );
    }

    // Skip null, functions, and symbols - these are valid
    if (
      value === null ||
      typeof value === 'function' ||
      typeof value === 'symbol'
    ) {
      continue;
    }

    // Recursively validate arrays
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === undefined) {
          throw new Error(
            `${modelName}.toJSON(): Array element at '${currentPath}[${index}]' is undefined`,
          );
        }
        // If array element is an object, recurse into it
        if (item !== null && typeof item === 'object') {
          validateJSON(item, modelName, `${currentPath}[${index}]`);
        }
      });
      continue;
    }

    // Recursively validate nested objects
    // Note: typeof null === 'object', but we already checked for null above
    if (typeof value === 'object') {
      validateJSON(value, modelName, currentPath);
    }

    // Primitives (string, number, boolean) are valid - no further checks needed
  }
};
