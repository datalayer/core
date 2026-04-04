/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { skills } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Skills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list skills', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ skills: [], total: 0 });

    await skills.listSkills(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/skills`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get skill', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ name: 'crawl' });

    await skills.getSkill(MOCK_JWT_TOKEN, 'crawl');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/skills/${encodeURIComponent('crawl')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get skill content', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ content: '...' });

    await skills.getSkillContent(MOCK_JWT_TOKEN, 'crawl');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/skills/${encodeURIComponent('crawl')}/content`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });
});
