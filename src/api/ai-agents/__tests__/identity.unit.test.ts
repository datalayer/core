/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { identity } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should exchange OAuth token', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ access_token: 'tok' });

    await identity.exchangeOAuthToken(
      MOCK_JWT_TOKEN,
      'code123',
      'github',
      'https://app/cb',
    );

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/identity/oauth/token`,
      method: 'POST',
      body: {
        code: 'code123',
        provider: 'github',
        redirect_uri: 'https://app/cb',
      },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get OAuth user info', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ login: 'user' });

    await identity.getOAuthUserInfo(MOCK_JWT_TOKEN, 'github', 'gh-token');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/identity/oauth/userinfo`,
      method: 'POST',
      body: { provider: 'github', access_token: 'gh-token' },
      token: MOCK_JWT_TOKEN,
    });
  });
});
