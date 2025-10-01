/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import { validateToken, ValidationError } from '../validation';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

describe('Validation', () => {
  describe('validateToken', () => {
    it('should accept valid token', () => {
      expect(() => validateToken(MOCK_JWT_TOKEN)).not.toThrow();
    });

    it('should reject empty token', () => {
      expect(() => validateToken('')).toThrow(ValidationError);
    });

    it('should reject undefined token', () => {
      expect(() => validateToken(undefined as any)).toThrow(ValidationError);
    });
  });
});
