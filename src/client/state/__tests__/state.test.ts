/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IAMState } from '../IAMState';
import { RuntimesState, RuntimeStatus } from '../RuntimesState';
import { SpacerState } from '../SpacerState';
import { PlatformStorage } from '../../storage';

/**
 * Mock storage implementation for testing
 */
class MockStorage implements PlatformStorage {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  // Test helper to inspect storage
  getData(): Map<string, string> {
    return new Map(this.data);
  }
}

describe('State Managers', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
    vi.useFakeTimers();
  });

  describe('IAMState', () => {
    let iamState: IAMState;

    beforeEach(() => {
      iamState = new IAMState(storage);
    });

    describe('Token Management', () => {
      it('should store and retrieve tokens', async () => {
        await iamState.setToken('test-token-123');
        expect(await iamState.getToken()).toBe('test-token-123');
      });

      it('should store refresh tokens separately', async () => {
        await iamState.setToken('access-token');
        await iamState.setRefreshToken('refresh-token');

        expect(await iamState.getToken()).toBe('access-token');
        expect(await iamState.getRefreshToken()).toBe('refresh-token');
      });

      it('should clear all tokens', async () => {
        await iamState.setToken('access-token');
        await iamState.setRefreshToken('refresh-token');
        await iamState.clearTokens();

        expect(await iamState.getToken()).toBeNull();
        expect(await iamState.getRefreshToken()).toBeNull();
      });
    });

    describe('User Management', () => {
      const testUser = {
        uid: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        githubId: 'gh-123',
      };

      it('should store and retrieve user data', async () => {
        await iamState.setUser(testUser as any);
        const user = await iamState.getUser();

        expect(user).not.toBeNull();
        expect(user?.uid).toBe('user-123');
        expect(user?.email).toBe('test@example.com');
      });

      it('should clear user data', async () => {
        await iamState.setUser(testUser as any);
        await iamState.clearUser();

        expect(await iamState.getUser()).toBeNull();
      });
    });

    describe('Authentication State', () => {
      it('should check authentication status', async () => {
        expect(await iamState.isAuthenticated()).toBe(false);

        await iamState.setToken('token');
        expect(await iamState.isAuthenticated()).toBe(true);

        await iamState.clearTokens();
        expect(await iamState.isAuthenticated()).toBe(false);
      });

      it('should generate auth headers', async () => {
        // No token
        let headers = await iamState.getAuthHeaders();
        expect(headers).toEqual({});

        // With token
        await iamState.setToken('test-token');
        headers = await iamState.getAuthHeaders();
        expect(headers).toEqual({
          Authorization: 'Bearer test-token',
        });
      });
    });

    describe('Service URLs', () => {
      it('should store and retrieve IAM URL', async () => {
        await iamState.setIamUrl('https://api.example.com/iam');
        expect(await iamState.getIamUrl()).toBe('https://api.example.com/iam');
      });
    });
  });

  describe('RuntimesState', () => {
    let runtimesState: RuntimesState;

    beforeEach(() => {
      runtimesState = new RuntimesState(storage);
    });

    describe('Runtime Caching', () => {
      const testRuntime = {
        pod_name: 'runtime-123',
        status: RuntimeStatus.RUNNING,
        environment: 'python-cpu',
        created_at: new Date().toISOString(),
        credits_used: 50,
        max_credits: 100,
      };

      it('should cache runtime data', async () => {
        await runtimesState.cacheRuntime(testRuntime);
        const cached = await runtimesState.getCachedRuntime('runtime-123');

        expect(cached).not.toBeNull();
        expect(cached?.pod_name).toBe('runtime-123');
        expect(cached?.status).toBe(RuntimeStatus.RUNNING);
      });

      it('should expire runtime cache after 5 minutes', async () => {
        await runtimesState.cacheRuntime(testRuntime);

        // Check immediately
        expect(
          await runtimesState.getCachedRuntime('runtime-123'),
        ).not.toBeNull();

        // Advance time by 6 minutes
        vi.setSystemTime(Date.now() + 6 * 60 * 1000);

        // Should be expired
        expect(await runtimesState.getCachedRuntime('runtime-123')).toBeNull();
      });

      it('should remove cached runtime', async () => {
        await runtimesState.cacheRuntime(testRuntime);
        await runtimesState.removeCachedRuntime('runtime-123');

        expect(await runtimesState.getCachedRuntime('runtime-123')).toBeNull();
      });
    });

    describe('Active Runtime', () => {
      it('should track active runtime', async () => {
        expect(await runtimesState.getActiveRuntime()).toBeNull();

        await runtimesState.setActiveRuntime('runtime-456');
        expect(await runtimesState.getActiveRuntime()).toBe('runtime-456');

        await runtimesState.clearActiveRuntime();
        expect(await runtimesState.getActiveRuntime()).toBeNull();
      });
    });

    describe('Environment Caching', () => {
      const environments = [
        { name: 'python-cpu', display_name: 'Python CPU' },
        { name: 'python-gpu', display_name: 'Python GPU' },
      ];

      it('should cache environments list', async () => {
        await runtimesState.cacheEnvironments(environments);
        const cached = await runtimesState.getCachedEnvironments();

        expect(cached).toHaveLength(2);
        expect(cached[0].name).toBe('python-cpu');
      });

      it('should expire environments cache after 1 hour', async () => {
        await runtimesState.cacheEnvironments(environments);

        // Check immediately
        expect(await runtimesState.getCachedEnvironments()).toHaveLength(2);

        // Advance time by 61 minutes
        vi.setSystemTime(Date.now() + 61 * 60 * 1000);

        // Should be expired
        expect(await runtimesState.getCachedEnvironments()).toHaveLength(0);
      });

      it('should get specific environment from cache', async () => {
        await runtimesState.cacheEnvironments(environments);
        const env = await runtimesState.getCachedEnvironment('python-gpu');

        expect(env).not.toBeNull();
        expect(env?.display_name).toBe('Python GPU');
      });
    });

    describe('Statistics', () => {
      it('should calculate runtime statistics', async () => {
        await runtimesState.cacheRuntime({
          pod_name: 'r1',
          status: RuntimeStatus.RUNNING,
          environment: 'env1',
          created_at: new Date().toISOString(),
          credits_used: 30,
        });

        await runtimesState.cacheRuntime({
          pod_name: 'r2',
          status: RuntimeStatus.TERMINATED,
          environment: 'env2',
          created_at: new Date().toISOString(),
          credits_used: 20,
        });

        const stats = await runtimesState.getStatistics();
        expect(stats.totalRuntimes).toBe(2);
        expect(stats.activeRuntimes).toBe(1);
        expect(stats.totalCreditsUsed).toBe(50);
      });
    });
  });

  describe('SpacerState', () => {
    let spacerState: SpacerState;

    beforeEach(() => {
      spacerState = new SpacerState(storage);
    });

    describe('Space Caching', () => {
      const spaces = [
        { id: 's1', uid: 'uid1', name: 'Space 1' },
        { id: 's2', uid: 'uid2', name: 'Space 2' },
      ];

      it('should cache spaces list', async () => {
        await spacerState.cacheSpaces(spaces as any);
        const cached = await spacerState.getCachedSpaces();

        expect(cached).toHaveLength(2);
        expect(cached[0].name).toBe('Space 1');
      });

      it('should expire spaces cache after 30 minutes', async () => {
        await spacerState.cacheSpaces(spaces as any);

        // Check immediately
        expect(await spacerState.getCachedSpaces()).toHaveLength(2);

        // Advance time by 31 minutes
        vi.setSystemTime(Date.now() + 31 * 60 * 1000);

        // Should be expired
        expect(await spacerState.getCachedSpaces()).toHaveLength(0);
      });

      it('should cache individual space', async () => {
        await spacerState.cacheSpace(spaces[0] as any);
        const cached = await spacerState.getCachedSpace('s1');

        expect(cached).not.toBeNull();
        expect(cached?.name).toBe('Space 1');
      });
    });

    describe('Notebook Caching', () => {
      const notebooks = [
        { id: 'n1', uid: 'uid1', space_id: 's1', name: 'Notebook 1' },
        { id: 'n2', uid: 'uid2', space_id: 's1', name: 'Notebook 2' },
      ];

      it('should cache notebooks for a space', async () => {
        await spacerState.cacheNotebooks(notebooks as any, 's1');
        const cached = await spacerState.getCachedNotebooks('s1');

        expect(cached).toHaveLength(2);
        expect(cached[0].name).toBe('Notebook 1');
      });

      it('should cache individual notebook', async () => {
        await spacerState.cacheNotebook(notebooks[0] as any);
        const cached = await spacerState.getCachedNotebook('n1');

        expect(cached).not.toBeNull();
        expect(cached?.name).toBe('Notebook 1');
      });

      it('should cache notebook content with ETag', async () => {
        const content = { cells: [], metadata: {} };
        await spacerState.cacheNotebookContent('n1', content, 'etag-123');

        const cached = await spacerState.getCachedNotebookContent('n1');
        expect(cached).not.toBeNull();
        expect(cached?.content).toEqual(content);
        expect(cached?.etag).toBe('etag-123');
      });

      it('should expire notebook content after 5 minutes', async () => {
        await spacerState.cacheNotebookContent('n1', {}, 'etag');

        // Advance time by 6 minutes
        vi.setSystemTime(Date.now() + 6 * 60 * 1000);

        expect(await spacerState.getCachedNotebookContent('n1')).toBeNull();
      });
    });

    describe('Recent Items', () => {
      it('should track recent items', async () => {
        await spacerState.addRecentItem('space', 's1', 'Space 1');
        await spacerState.addRecentItem('notebook', 'n1', 'Notebook 1');

        const recent = await spacerState.getRecentItems();
        expect(recent).toHaveLength(2);
        expect(recent[0].type).toBe('notebook'); // Most recent first
        expect(recent[1].type).toBe('space');
      });

      it('should deduplicate recent items', async () => {
        await spacerState.addRecentItem('space', 's1', 'Space 1');
        await spacerState.addRecentItem('notebook', 'n1', 'Notebook 1');
        await spacerState.addRecentItem('space', 's1', 'Space 1 Updated');

        const recent = await spacerState.getRecentItems();
        expect(recent).toHaveLength(2);
        expect(recent[0].id).toBe('s1'); // Moved to front
        expect(recent[0].name).toBe('Space 1 Updated'); // Name updated
      });

      it('should limit recent items to 20', async () => {
        // Add 25 items
        for (let i = 0; i < 25; i++) {
          await spacerState.addRecentItem('notebook', `n${i}`, `Notebook ${i}`);
        }

        const recent = await spacerState.getRecentItems();
        expect(recent).toHaveLength(20);
        expect(recent[0].id).toBe('n24'); // Most recent
        expect(recent[19].id).toBe('n5'); // Oldest kept
      });
    });
  });

  describe('State Clear Operations', () => {
    it('should clear all IAM state', async () => {
      const iamState = new IAMState(storage);
      await iamState.setToken('token');
      await iamState.setUser({ uid: 'user', email: 'test@example.com' } as any);

      await iamState.clear();

      expect(await iamState.getToken()).toBeNull();
      expect(await iamState.getUser()).toBeNull();
    });

    it('should clear all runtime state', async () => {
      const runtimesState = new RuntimesState(storage);
      await runtimesState.setActiveRuntime('runtime-123');
      await runtimesState.cacheEnvironments([{ name: 'env' }]);

      await runtimesState.clear();

      expect(await runtimesState.getActiveRuntime()).toBeNull();
      expect(await runtimesState.getCachedEnvironments()).toHaveLength(0);
    });

    it('should clear all spacer state', async () => {
      const spacerState = new SpacerState(storage);
      await spacerState.cacheSpaces([{ id: 's1', uid: 'u1' }] as any);
      await spacerState.addRecentItem('space', 's1');

      await spacerState.clear();

      expect(await spacerState.getCachedSpaces()).toHaveLength(0);
      expect(await spacerState.getRecentItems()).toHaveLength(0);
    });
  });
});
