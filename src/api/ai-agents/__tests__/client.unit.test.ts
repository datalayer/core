/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIAgentsClient } from '../client';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn().mockResolvedValue({}),
}));

describe('createAIAgentsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Config ──────────────────────────────────────────────────────

  it('should default to platform type and prod URL', () => {
    const client = createAIAgentsClient({ token: MOCK_JWT_TOKEN });
    expect(client.config.type).toBe('platform');
    expect(client.config.baseUrl).toBe('https://prod1.datalayer.run');
  });

  it('should accept local type', () => {
    const client = createAIAgentsClient({
      token: MOCK_JWT_TOKEN,
      baseUrl: 'http://localhost:8765',
      type: 'local',
    });
    expect(client.config.type).toBe('local');
    expect(client.config.baseUrl).toBe('http://localhost:8765');
  });

  // ── Platform paths (/api/ai-agents/v1) ─────────────────────────

  it('should use /api/ai-agents/v1 base path for platform', async () => {
    const client = createAIAgentsClient({ token: MOCK_JWT_TOKEN });

    await client.agents.list();

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://prod1.datalayer.run/api/ai-agents/v1/agents',
      }),
    );
  });

  it('should use /webhooks/ path for platform webhooks', async () => {
    const client = createAIAgentsClient({ token: MOCK_JWT_TOKEN });

    await client.triggers.getWebhookInfo('ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/api/ai-agents/v1/webhooks/ag1'),
      }),
    );
  });

  it('should use /mark-all-read path for platform notifications', async () => {
    const client = createAIAgentsClient({ token: MOCK_JWT_TOKEN });

    await client.notifications.markAllRead();

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/notifications/mark-all-read'),
      }),
    );
  });

  // ── Local paths (/api/v1) ──────────────────────────────────────

  it('should use /api/v1 base path for local', async () => {
    const client = createAIAgentsClient({
      token: MOCK_JWT_TOKEN,
      baseUrl: 'http://localhost:8765',
      type: 'local',
    });

    await client.agents.list();

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:8765/api/v1/agents',
      }),
    );
  });

  it('should use /agents/{id}/webhook path for local webhooks', async () => {
    const client = createAIAgentsClient({
      token: MOCK_JWT_TOKEN,
      baseUrl: 'http://localhost:8765',
      type: 'local',
    });

    await client.triggers.getWebhookInfo('ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/api/v1/agents/ag1/webhook'),
      }),
    );
  });

  it('should use /read-all path for local notifications', async () => {
    const client = createAIAgentsClient({
      token: MOCK_JWT_TOKEN,
      baseUrl: 'http://localhost:8765',
      type: 'local',
    });

    await client.notifications.markAllRead();

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/notifications/read-all'),
      }),
    );
  });

  // ── All modules exist ──────────────────────────────────────────

  it('should expose all 16 modules', () => {
    const client = createAIAgentsClient({ token: MOCK_JWT_TOKEN });

    expect(client.health).toBeDefined();
    expect(client.agents).toBeDefined();
    expect(client.library).toBeDefined();
    expect(client.configuration).toBeDefined();
    expect(client.toolApprovals).toBeDefined();
    expect(client.context).toBeDefined();
    expect(client.history).toBeDefined();
    expect(client.sandbox).toBeDefined();
    expect(client.mcp).toBeDefined();
    expect(client.triggers).toBeDefined();
    expect(client.notifications).toBeDefined();
    expect(client.events).toBeDefined();
    expect(client.output).toBeDefined();
    expect(client.evals).toBeDefined();
    expect(client.skills).toBeDefined();
    expect(client.identity).toBeDefined();
  });

  // ── Encoding ───────────────────────────────────────────────────

  it('should encode path parameters', async () => {
    const client = createAIAgentsClient({ token: MOCK_JWT_TOKEN });

    await client.agents.get('agent/with/slashes');

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining(
          `/agents/${encodeURIComponent('agent/with/slashes')}`,
        ),
      }),
    );
  });

  // ── Token passed through ───────────────────────────────────────

  it('should pass token to every request', async () => {
    const client = createAIAgentsClient({ token: MOCK_JWT_TOKEN });

    await client.health.check();

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({ token: MOCK_JWT_TOKEN }),
    );
  });

  // ── Local-only endpoints work ──────────────────────────────────

  it('should call sandbox endpoint on local', async () => {
    const client = createAIAgentsClient({
      token: MOCK_JWT_TOKEN,
      baseUrl: 'http://localhost:8765',
      type: 'local',
    });

    await client.sandbox.getStatus();

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:8765/api/v1/configure/sandbox-status',
        method: 'GET',
      }),
    );
  });

  it('should call context snapshot on local', async () => {
    const client = createAIAgentsClient({
      token: MOCK_JWT_TOKEN,
      baseUrl: 'http://localhost:8765',
      type: 'local',
    });

    await client.context.getSnapshot('my-agent');

    expect(requestDatalayerAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:8765/api/v1/configure/agents/my-agent/context-snapshot',
      }),
    );
  });
});
