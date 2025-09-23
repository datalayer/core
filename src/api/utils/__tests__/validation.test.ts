/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect } from 'vitest';
import {
  validateToken,
  validateRequired,
  validateRequiredString,
} from '../validation';

describe('validation utilities', () => {
  describe('validateToken', () => {
    const validToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Vg30C57s3l90JNap_VgMhKZjfc-p7SoBXaSAy8c6BS8';

    it('should accept valid JWT tokens', () => {
      expect(() => validateToken(validToken)).not.toThrow();
    });

    it('should reject null or undefined tokens', () => {
      expect(() => validateToken(null)).toThrow(
        'Authentication token is required',
      );
      expect(() => validateToken(undefined)).toThrow(
        'Authentication token is required',
      );
    });

    it('should reject empty or whitespace tokens', () => {
      expect(() => validateToken('')).toThrow(
        'Authentication token is required',
      );
      expect(() => validateToken('  ')).toThrow(
        'Authentication token is required',
      );
    });

    it('should reject tokens without three parts', () => {
      expect(() => validateToken('part1.part2')).toThrow(
        'Invalid token format: JWT must have three parts separated by dots',
      );
      expect(() => validateToken('part1.part2.part3.part4')).toThrow(
        'Invalid token format: JWT must have three parts separated by dots',
      );
      expect(() => validateToken('singlepart')).toThrow(
        'Invalid token format: JWT must have three parts separated by dots',
      );
    });

    it('should reject tokens with empty parts', () => {
      expect(() => validateToken('.part2.part3')).toThrow(
        'Invalid token format: Part 1 is empty',
      );
      expect(() => validateToken('part1..part3')).toThrow(
        'Invalid token format: Part 2 is empty',
      );
      expect(() => validateToken('part1.part2.')).toThrow(
        'Invalid token format: Part 3 is empty',
      );
    });

    it('should reject tokens with invalid Base64URL characters', () => {
      const invalidCharToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI!@#$.Vg30C57s3l90JNap_VgMhKZjfc-p7SoBXaSAy8c6BS8';
      expect(() => validateToken(invalidCharToken)).toThrow(
        'Invalid token format: Part 2 contains invalid characters',
      );
    });

    it('should reject tokens that are too short', () => {
      const shortToken = 'eyJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxIn0.signature';
      expect(() => validateToken(shortToken)).toThrow(
        'Invalid token format: Token is too short to be a valid JWT',
      );
    });

    it('should reject tokens that are too long', () => {
      const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const payload = 'a'.repeat(4000);
      const signature = 'b'.repeat(1000);
      const longToken = `${header}.${payload}.${signature}`;
      expect(() => validateToken(longToken)).toThrow(
        'Invalid token format: Token exceeds maximum expected length',
      );
    });

    it('should reject tokens with invalid JWT header', () => {
      const invalidHeaderToken =
        'notbase64.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature123456789012345';
      expect(() => validateToken(invalidHeaderToken)).toThrow(
        'Invalid token format: JWT header is not valid base64-encoded JSON',
      );
    });

    it('should reject tokens with missing algorithm in header', () => {
      // This token has valid JSON header but missing 'alg' field
      const noAlgToken =
        'eyJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.signature123456789012345678901234567890';
      expect(() => validateToken(noAlgToken)).toThrow(
        'Invalid token format: Missing algorithm in JWT header',
      );
    });

    it('should reject tokens with invalid JWT payload', () => {
      // This token has enough length but invalid base64 in payload
      const invalidPayloadToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.notvalidbase64jsonbutlongenoughtopasslengthchecknotvalidbase64jsonbutlongenough.signature123456789012345678901234567890';
      expect(() => validateToken(invalidPayloadToken)).toThrow(
        'Invalid token format: JWT payload is not valid base64-encoded JSON',
      );
    });

    it('should reject expired tokens', () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';
      expect(() => validateToken(expiredToken)).toThrow('Token has expired');
    });

    it('should reject tokens not yet valid (nbf claim)', () => {
      const futureToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJuYmYiOjk5OTk5OTk5OTl9.UGLFIRACvGl-MiFpZmAiDuVm7br9tBTxMOqb4sjN-jg';
      expect(() => validateToken(futureToken)).toThrow(
        'Token is not yet valid',
      );
    });

    it('should reject tokens with signature that is too short', () => {
      const shortSigToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.short';
      expect(() => validateToken(shortSigToken)).toThrow(
        'Invalid token format: JWT signature is too short',
      );
    });

    it('should trim whitespace from tokens', () => {
      const tokenWithWhitespace = `  ${validToken}  `;
      expect(() => validateToken(tokenWithWhitespace)).not.toThrow();
    });
  });

  describe('validateRequired', () => {
    it('should accept valid values', () => {
      expect(() => validateRequired('value', 'param')).not.toThrow();
      expect(() => validateRequired(0, 'param')).not.toThrow();
      expect(() => validateRequired(false, 'param')).not.toThrow();
      expect(() => validateRequired('', 'param')).not.toThrow();
    });

    it('should reject null values', () => {
      expect(() => validateRequired(null, 'param')).toThrow(
        'param is required',
      );
    });

    it('should reject undefined values', () => {
      expect(() => validateRequired(undefined, 'param')).toThrow(
        'param is required',
      );
    });
  });

  describe('validateRequiredString', () => {
    it('should accept valid strings', () => {
      expect(() => validateRequiredString('value', 'param')).not.toThrow();
      expect(() => validateRequiredString('  value  ', 'param')).not.toThrow();
    });

    it('should reject null values', () => {
      expect(() => validateRequiredString(null, 'param')).toThrow(
        'param is required',
      );
    });

    it('should reject undefined values', () => {
      expect(() => validateRequiredString(undefined, 'param')).toThrow(
        'param is required',
      );
    });

    it('should reject empty strings', () => {
      expect(() => validateRequiredString('', 'param')).toThrow(
        'param is required',
      );
    });

    it('should reject whitespace-only strings', () => {
      expect(() => validateRequiredString('   ', 'param')).toThrow(
        'param is required',
      );
    });
  });
});
