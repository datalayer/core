/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { events } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list all events', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ events: [] });

    await events.listAllEvents(MOCK_JWT_TOKEN, { limit: 10 });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/events?limit=10`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should list events for agent', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ events: [] });

    await events.listEvents(MOCK_JWT_TOKEN, 'ag1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/events`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get event', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'ev1' });

    await events.getEvent(MOCK_JWT_TOKEN, 'ag1', 'ev1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/events/${encodeURIComponent('ev1')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should create event', async () => {
    const data = { agent_id: 'ag1', title: 'Test event' };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ success: true });

    await events.createEvent(MOCK_JWT_TOKEN, data);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/events`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
      body: data,
    });
  });

  it('should update event', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await events.updateEvent(MOCK_JWT_TOKEN, 'ag1', 'ev1', { read: true });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/events/${encodeURIComponent('ev1')}`,
      method: 'PATCH',
      token: MOCK_JWT_TOKEN,
      body: { read: true },
    });
  });

  it('should delete event', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ success: true });

    await events.deleteEvent(MOCK_JWT_TOKEN, 'ag1', 'ev1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/events/${encodeURIComponent('ev1')}`,
      method: 'DELETE',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should mark event read via dedicated endpoint', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await events.markEventRead(MOCK_JWT_TOKEN, 'ag1', 'ev1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/events/${encodeURIComponent('ev1')}/mark-read`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should mark event unread via dedicated endpoint', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({});

    await events.markEventUnread(MOCK_JWT_TOKEN, 'ag1', 'ev1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/agents/${encodeURIComponent('ag1')}/events/${encodeURIComponent('ev1')}/mark-unread`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });
});
