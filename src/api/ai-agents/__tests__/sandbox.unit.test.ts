/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sandbox } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Sandbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get codemode status', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ enabled: true });

    await sandbox.getCodemodeStatus(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/codemode-status`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should toggle codemode', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'ok' });

    await sandbox.toggleCodemode(MOCK_JWT_TOKEN, {
      enabled: true,
      skills: ['github'],
    });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/codemode/toggle`,
      method: 'POST',
      body: { enabled: true, skills: ['github'] },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get sandbox status', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ available: true });

    await sandbox.getSandboxStatus(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/sandbox-status`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should interrupt sandbox with agent ID', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ interrupted: true });

    await sandbox.interruptSandbox(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/configure/sandbox/interrupt?agent_id=ag1`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should configure sandbox', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await sandbox.configureSandbox(MOCK_JWT_TOKEN, {
      variant: 'local-jupyter',
    });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/sandbox/configure`,
      method: 'POST',
      body: { variant: 'local-jupyter' },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should restart sandbox', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await sandbox.restartSandbox(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/sandbox/restart`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });
});
