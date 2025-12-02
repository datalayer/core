/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticationManager } from '../AuthenticationManager';
import { NodeStorage } from '../storage';

// Mock the API modules
vi.mock('../../../api/iam/authentication', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../../api/iam/profile', () => ({
  whoami: vi.fn(),
}));

describe('AuthenticationManager', () => {
  let auth: AuthenticationManager;
  let storage: NodeStorage;
  const iamUrl = 'https://test.datalayer.run';

  beforeEach(() => {
    storage = new NodeStorage();
    auth = new AuthenticationManager(iamUrl, storage);
  });

  describe('constructor', () => {
    it('should create an instance with default storage', () => {
      const authDefault = new AuthenticationManager(iamUrl);
      expect(authDefault).toBeDefined();
    });

    it('should create an instance with custom storage', () => {
      expect(auth).toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    it('should return undefined when no user is authenticated', () => {
      expect(auth.getCurrentUser()).toBeUndefined();
    });
  });

  describe('getCurrentToken', () => {
    it('should return undefined when no token is set', () => {
      expect(auth.getCurrentToken()).toBeUndefined();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('storeToken', () => {
    it('should store token in storage', async () => {
      auth.storeToken('test-token');
      // Wait a bit for async keytar operations
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(storage.getToken()).toBe('test-token');
      expect(auth.getCurrentToken()).toBe('test-token');
    });
  });

  describe('clearStoredToken', () => {
    it('should clear token from storage', async () => {
      auth.storeToken('test-token');
      await new Promise(resolve => setTimeout(resolve, 100));
      auth.clearStoredToken();
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(storage.getToken()).toBeNull();
      expect(auth.getCurrentToken()).toBeUndefined();
    });
  });

  describe('getStoredToken', () => {
    it('should get token from storage', async () => {
      storage.setToken?.('stored-token');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(auth.getStoredToken()).toBe('stored-token');
    });

    it('should return null when no token in storage', () => {
      expect(auth.getStoredToken()).toBeNull();
    });
  });
});
