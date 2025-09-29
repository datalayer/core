/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../User';
import type { User as ApiUser } from '../../../api/types/iam';

// Mock SDK Base
class MockSDKBase {}

describe('User Model', () => {
  let mockSDK: MockSDKBase;

  beforeEach(() => {
    mockSDK = new MockSDKBase();
  });

  describe('Basic Properties', () => {
    it('should expose all basic user properties', () => {
      const userData: ApiUser = {
        id: 'user-123',
        uid: 'uid-456',
        email: 'test@example.com',
        handle: 'testhandle',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        is_active: true,
        is_verified: true,
      };

      const user = new User(userData, mockSDK as any);

      expect(user.id).toBe('user-123');
      expect(user.uid).toBe('uid-456');
      expect(user.email).toBe('test@example.com');
      expect(user.handle).toBe('testhandle');
      expect(user.username).toBe('testuser');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.isActive).toBe(true);
      expect(user.isVerified).toBe(true);
      expect(user.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(user.updatedAt).toBe('2024-01-02T00:00:00Z');
    });

    it('should handle optional properties gracefully', () => {
      const minimalUser: ApiUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const user = new User(minimalUser, mockSDK as any);

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.uid).toBeUndefined();
      expect(user.handle).toBeUndefined();
      expect(user.username).toBeUndefined();
      expect(user.firstName).toBe('');
      expect(user.lastName).toBe('');
      expect(user.isActive).toBe(true); // Default
      expect(user.isVerified).toBe(false); // Default
    });

    it('should handle custom properties', () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        is_admin: true,
        credits: 500,
      };

      const user = new User(userData, mockSDK as any);

      expect(user.isAdmin).toBe(true);
      expect(user.credits).toBe(500);
    });
  });

  describe('Display Name', () => {
    it('should use display_name from API first', () => {
      const user = new User(
        {
          id: '1',
          email: 'test@example.com',
          display_name: 'Custom Display',
          first_name: 'John',
          last_name: 'Doe',
          handle: 'johndoe',
          username: 'jdoe',
        },
        mockSDK as any,
      );

      expect(user.getDisplayName()).toBe('Custom Display');
    });

    it('should fall back to full name', () => {
      const user = new User(
        {
          id: '1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        mockSDK as any,
      );

      expect(user.getDisplayName()).toBe('John Doe');
    });

    it('should fall back to handle', () => {
      const user = new User(
        {
          id: '1',
          email: 'test@example.com',
          handle: 'johndoe',
        },
        mockSDK as any,
      );

      expect(user.getDisplayName()).toBe('johndoe');
    });

    it('should fall back to username', () => {
      const user = new User(
        {
          id: '1',
          email: 'test@example.com',
          username: 'jdoe',
        },
        mockSDK as any,
      );

      expect(user.getDisplayName()).toBe('jdoe');
    });

    it('should fall back to email prefix', () => {
      const user = new User(
        {
          id: '1',
          email: 'john.doe@example.com',
        },
        mockSDK as any,
      );

      expect(user.getDisplayName()).toBe('john.doe');
    });
  });

  describe('Initials', () => {
    it('should generate initials from first and last name', () => {
      const user = new User(
        {
          id: '1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        mockSDK as any,
      );

      expect(user.getInitials()).toBe('JD');
    });

    it('should generate initials from display name parts', () => {
      const user = new User(
        {
          id: '1',
          email: 'test@example.com',
          handle: 'john_doe',
        },
        mockSDK as any,
      );

      expect(user.getInitials()).toBe('JD');
    });

    it('should handle single names', () => {
      const user = new User(
        {
          id: '1',
          email: 'admin@example.com',
          username: 'admin',
        },
        mockSDK as any,
      );

      expect(user.getInitials()).toBe('AD');
    });
  });

  describe('OAuth Providers', () => {
    it('should parse GitHub provider', () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        github_id: 'gh-123',
        github_username: 'octocat',
        github_email: 'octocat@github.com',
        github_avatar_url: 'https://github.com/octocat.png',
      };

      const user = new User(userData, mockSDK as any);
      const providers = user.getProviders();

      expect(providers).toHaveLength(1);
      expect(providers[0].type).toBe('github');
      expect(providers[0].username).toBe('octocat');
    });

    it('should parse LinkedIn provider', () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        linkedin_id: 'li-123',
        linkedin_email: 'user@linkedin.com',
        linkedin_display_name: 'LinkedIn User',
      };

      const user = new User(userData, mockSDK as any);
      const providers = user.getProviders();

      expect(providers).toHaveLength(1);
      expect(providers[0].type).toBe('linkedin');
      expect(providers[0].displayName).toBe('LinkedIn User');
    });

    it('should parse multiple providers', () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        github_id: 'gh-123',
        linkedin_id: 'li-456',
      };

      const user = new User(userData, mockSDK as any);
      const providers = user.getProviders();

      expect(providers).toHaveLength(2);
      expect(user.hasProvider('github')).toBe(true);
      expect(user.hasProvider('linkedin')).toBe(true);
    });

    it('should get specific provider', () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        github_id: 'gh-123',
        github_username: 'octocat',
      };

      const user = new User(userData, mockSDK as any);
      const github = user.getProvider('github');

      expect(github).not.toBeUndefined();
      expect(github?.username).toBe('octocat');
      expect(user.getProvider('linkedin')).toBeUndefined();
    });
  });

  describe('Avatar URL', () => {
    it('should use provider avatar URL if available', async () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        github_id: 'gh-123',
        github_avatar_url: 'https://avatars.github.com/u/123',
      };

      const user = new User(userData, mockSDK as any);
      const avatarUrl = await user.getAvatarUrl();

      expect(avatarUrl).toBe('https://avatars.github.com/u/123');
    });

    it('should use provider avatar URL', async () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        linkedin_id: 'li-123', // Need linkedin_id for provider to be recognized
        linkedin_avatar_url: 'https://linkedin.com/avatar.jpg',
      };

      const user = new User(userData, mockSDK as any);
      const avatarUrl = await user.getAvatarUrl();

      expect(avatarUrl).toBe('https://linkedin.com/avatar.jpg');
    });

    it('should fall back to UI avatars', async () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      };

      const user = new User(userData, mockSDK as any);

      // Mock crypto.subtle to force UI avatars fallback
      const originalCrypto = (globalThis as any).crypto;
      Object.defineProperty(globalThis, 'crypto', {
        value: { ...originalCrypto, subtle: undefined },
        configurable: true,
      });

      const avatarUrl = await user.getAvatarUrl();
      expect(avatarUrl).toContain('ui-avatars.com');
      expect(avatarUrl).toContain('Test%20User'); // encodeURIComponent uses %20 for spaces

      // Restore original crypto
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
      });
    });
  });

  describe('User Comparison', () => {
    it('should compare users by ID', () => {
      const user1 = new User(
        { id: 'user-123', email: 'test1@example.com' },
        mockSDK as any,
      );
      const user2 = new User(
        { id: 'user-123', email: 'test2@example.com' },
        mockSDK as any,
      );
      const user3 = new User(
        { id: 'user-456', email: 'test3@example.com' },
        mockSDK as any,
      );

      expect(user1.equals(user2)).toBe(true);
      expect(user1.equals(user3)).toBe(false);
      expect(user1.equals('user-123')).toBe(true);
      expect(user1.equals('user-456')).toBe(false);
    });

    it('should compare by UID as fallback', () => {
      const user1 = new User(
        { id: 'id1', uid: 'uid-123', email: 'test@example.com' },
        mockSDK as any,
      );
      const user2 = new User(
        { id: 'id2', uid: 'uid-123', email: 'test@example.com' },
        mockSDK as any,
      );

      expect(user1.equals(user2)).toBe(true);
      expect(user1.equals('uid-123')).toBe(true);
    });
  });

  describe('User Update', () => {
    it('should update user data', () => {
      const user = new User(
        { id: 'user-123', email: 'old@example.com' },
        mockSDK as any,
      );

      user.update({
        email: 'new@example.com',
        first_name: 'Updated',
      });

      expect(user.email).toBe('new@example.com');
      expect(user.firstName).toBe('Updated');
    });

    it('should clear caches on update', async () => {
      const userData: any = {
        id: 'user-123',
        email: 'test@example.com',
        github_id: 'gh-123', // Need github_id for provider to be recognized
        github_username: 'octocat',
      };

      const user = new User(userData, mockSDK as any);

      // Update should clear cache but preserve github_id
      user.update({ username: 'newuser' } as any);

      // Provider should still exist (github_id wasn't removed)
      const providers = user.getProviders();
      expect(providers).toHaveLength(1); // GitHub provider still exists
    });
  });

  describe('User Serialization', () => {
    it('should convert to JSON', () => {
      const userData: ApiUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
      };

      const user = new User(userData, mockSDK as any);
      const json = user.toJSON();

      expect(json).toEqual(userData);
    });
  });

  describe('Credits', () => {
    it('should check credit availability', () => {
      const user = new User(
        { id: '1', email: 'test@example.com' } as any,
        mockSDK as any,
      );
      (user as any).data.credits = 100;

      expect(user.hasCredits(50)).toBe(true);
      expect(user.hasCredits(150)).toBe(false);
    });
  });
});
