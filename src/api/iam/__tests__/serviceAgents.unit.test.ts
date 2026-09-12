/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The service agents API: an organization's own principals.
 *
 * The property worth most of this file is that **the key is in a write's
 * answer and in no read's**. IAM stores a hash and cannot show it again, so
 * a client that expected to read it back later would send somebody looking
 * for a page that does not exist.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import {
  SERVICE_AGENT_SCOPES,
  createServiceAgent,
  listServiceAgents,
  revokeServiceAgent,
  rotateServiceAgentKey,
} from '../serviceAgents';

const IAM = 'https://iam.test';
const ORG = '01ORG';

describe('service agents API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists an organization’s agents, revoked ones included', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      agents: [
        {
          uid: '01SA',
          name: 'nightly ingest',
          scopes: 'runtimes:read data:read',
          revoked: false,
          key_rotated_at: '2026-08-27T09:00:00Z',
        },
        { uid: '01SB', name: 'retired', scopes: 'data:read', revoked: true },
      ],
    } as never);

    const agents = await listServiceAgents('token', ORG, IAM);

    expect(agents).toHaveLength(2);
    expect(agents[0].name).toBe('nightly ingest');
    // Revoked is a state to render, never a reason to drop the row: its
    // audit rows name it.
    expect(agents[1].revoked).toBe(true);
  });

  it('asks the organization’s own path', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, agents: [] } as never);

    await listServiceAgents('token', ORG, IAM);

    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/organizations/${ORG}/mcp-service-agents`,
    );
  });

  it('carries the key out of a create, and only out of a write', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      agent: { uid: '01SA', name: 'bot', key: 'dla_sa_once' },
    } as never);

    const created = await createServiceAgent(
      'token',
      ORG,
      { name: 'bot', scopes: ['data:read'] },
      IAM,
    );

    expect(created.key).toBe('dla_sa_once');
  });

  it('never invents a key for a listed agent', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      agents: [{ uid: '01SA', name: 'bot' }],
    } as never);

    const [agent] = await listServiceAgents('token', ORG, IAM);

    expect(agent).not.toHaveProperty('key');
  });

  it('sends the scopes the caller chose, and the fields IAM names', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, agent: { uid: '01SA' } } as never);

    await createServiceAgent(
      'token',
      ORG,
      { name: 'bot', scopes: ['data:read', 'runtimes:read'], teamUid: '01TEAM' },
      IAM,
    );

    expect(request.mock.calls[0][0].body).toEqual({
      name: 'bot',
      scopes: ['data:read', 'runtimes:read'],
      description: '',
      team_uid: '01TEAM',
    });
  });

  it('rotates against the agent’s own path and answers the new key', async () => {
    const request = vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      agent: { uid: '01SA', key: 'dla_sa_new' },
    } as never);

    const rotated = await rotateServiceAgentKey('token', ORG, '01SA', IAM);

    expect(rotated.key).toBe('dla_sa_new');
    expect(request.mock.calls[0][0].url).toBe(
      `${IAM}/api/iam/v1/organizations/${ORG}/mcp-service-agents/01SA/rotate`,
    );
  });

  it('revokes without pretending to return a key', async () => {
    vi.spyOn(DatalayerApi, 'requestDatalayerAPI').mockResolvedValue({
      success: true,
      agent: { uid: '01SA', revoked: true },
    } as never);

    const revoked = await revokeServiceAgent('token', ORG, '01SA', IAM);

    expect(revoked.revoked).toBe(true);
    expect(revoked).not.toHaveProperty('key');
  });

  it('offers only the scopes a principal that is not a person can hold', () => {
    // The scopes about a *person* — their profile, acting as them — are
    // refused by IAM. Offering one would invite somebody to grant something
    // that silently does nothing.
    expect(SERVICE_AGENT_SCOPES).not.toContain('profile:read');
    expect(SERVICE_AGENT_SCOPES).toContain('sandboxes:manage');
  });

  it('escapes a uid rather than pasting it into a path', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValue({ success: true, agent: { uid: 'x' } } as never);

    await revokeServiceAgent('token', 'org/../other', 'a b', IAM);

    expect(request.mock.calls[0][0].url).toContain('org%2F..%2Fother');
    expect(request.mock.calls[0][0].url).toContain('a%20b');
  });
});
