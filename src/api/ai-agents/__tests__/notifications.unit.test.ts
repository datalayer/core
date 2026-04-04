/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifications } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list notifications with filters', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await notifications.listNotifications(MOCK_JWT_TOKEN, {
      agentId: 'ag1',
      unreadOnly: true,
      limit: 10,
    });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/notifications?agent_id=ag1&unread_only=true&limit=10`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get notification', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'n1' });

    await notifications.getNotification(MOCK_JWT_TOKEN, 'n1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/notifications/${encodeURIComponent('n1')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should mark notification read', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue(undefined);

    await notifications.markNotificationRead(MOCK_JWT_TOKEN, 'n1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/notifications/${encodeURIComponent('n1')}/read`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should mark all notifications read', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue(undefined);

    await notifications.markAllNotificationsRead(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/notifications/mark-all-read`,
      method: 'POST',
      body: { agent_id: 'ag1' },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get unread count', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ count: 5 });

    const result =
      await notifications.getUnreadNotificationCount(MOCK_JWT_TOKEN);

    expect(result).toEqual({ count: 5 });
  });
});
