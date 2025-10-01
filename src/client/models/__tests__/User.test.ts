/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../User';
import type { User as UserData } from '../../../api/types/iam';

describe('User Model', () => {
  const mockUserData: UserData = {
    id: 'user-123',
    uid: 'user-uid-123',
    email_s: 'test@example.com',
    handle_s: 'testuser',
    first_name_t: 'John',
    last_name_t: 'Doe',
    avatar_url_s: 'https://example.com/avatar.png',
  };

  let user: User;

  beforeEach(() => {
    user = new User(mockUserData);
  });

  describe('Properties', () => {
    it('should return id', () => {
      expect(user.id).toBe('user-123');
    });

    it('should return uid', () => {
      expect(user.uid).toBe('user-uid-123');
    });

    it('should return email', () => {
      expect(user.email).toBe('test@example.com');
    });

    it('should return handle', () => {
      expect(user.handle).toBe('testuser');
    });

    it('should return firstName', () => {
      expect(user.firstName).toBe('John');
    });

    it('should return lastName', () => {
      expect(user.lastName).toBe('Doe');
    });

    it('should return displayName', () => {
      expect(user.displayName).toBe('John Doe');
    });

    it('should return avatarUrl', () => {
      expect(user.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should handle missing optional fields', () => {
      const minimalData: UserData = {
        id: 'user-456',
        uid: 'user-uid-456',
        email_s: 'minimal@example.com',
        handle_s: 'minimal',
        first_name_t: '',
        last_name_t: '',
        avatar_url_s: '',
      };
      const minimalUser = new User(minimalData);

      expect(minimalUser.displayName).toBe('');
      expect(minimalUser.avatarUrl).toBe('');
    });
  });

  describe('Utility methods', () => {
    it('should return JSON', () => {
      const json = user.toJSON();
      expect(json.id).toBe('user-123');
      expect(json.uid).toBe('user-uid-123');
      expect(json.email).toBe('test@example.com');
      expect(json.firstName).toBe('John');
      expect(json.lastName).toBe('Doe');
      expect(json.displayName).toBe('John Doe');
      expect(json.handle).toBe('testuser');
      expect(json.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should return string representation', () => {
      expect(user.toString()).toBe('User(user-uid-123, John Doe)');
    });

    it('should return raw data', () => {
      const raw = user.rawData();
      expect(raw).toEqual(mockUserData);
    });
  });
});
