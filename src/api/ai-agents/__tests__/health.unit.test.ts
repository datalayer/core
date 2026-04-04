/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { health } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call healthCheck with default URL', async () => {
    const mock = {
      status: 'healthy',
      timestamp: '2025-01-01T00:00:00Z',
      service: 'agent-runtimes',
    };
    vi.mocked(requestDatalayerAPI).mockResolvedValue(mock);

    const result = await health.healthCheck(MOCK_JWT_TOKEN);

    expect(result).toEqual(mock);
    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/health`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should call readinessCheck', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'ready' });

    await health.readinessCheck(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/health/ready`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should call livenessCheck', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'alive' });

    await health.livenessCheck(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/health/live`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should call getStartupInfo', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'ok' });

    await health.getStartupInfo(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/health/startup`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should use custom base URL', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'healthy' });

    await health.healthCheck(MOCK_JWT_TOKEN, 'http://localhost:8765');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `http://localhost:8765${PREFIX}/health`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should propagate errors', async () => {
    vi.mocked(requestDatalayerAPI).mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(health.healthCheck(MOCK_JWT_TOKEN)).rejects.toThrow(
      'Connection refused',
    );
  });
});
