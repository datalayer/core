/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolApprovals } from '..';
import { requestDatalayerAPI } from '../../DatalayerApi';
import { MOCK_JWT_TOKEN } from '../../../__tests__/shared/test-constants';

vi.mock('../../DatalayerApi', () => ({
  requestDatalayerAPI: vi.fn(),
}));

const BASE = 'https://prod1.datalayer.run';
const PREFIX = '/api/ai-agents/v1';

describe('AI Agents Tool Approvals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list tool approvals without filters', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await toolApprovals.listToolApprovals(MOCK_JWT_TOKEN);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should list tool approvals with filters', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue([]);

    await toolApprovals.listToolApprovals(MOCK_JWT_TOKEN, {
      agent_id: 'ag1',
      status: 'pending',
    });

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals?agent_id=ag1&status=pending`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get tool approval with encoded ID', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ id: 'ap1' });

    await toolApprovals.getToolApproval(MOCK_JWT_TOKEN, 'ap1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals/${encodeURIComponent('ap1')}`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should create tool approval', async () => {
    const body = { tool_name: 'deploy_prod', tool_args: { env: 'prod' } };
    vi.mocked(requestDatalayerAPI).mockResolvedValue({
      id: 'new',
      status: 'pending',
    });

    await toolApprovals.createToolApproval(MOCK_JWT_TOKEN, body);

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals`,
      method: 'POST',
      body,
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should approve tool call with note', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'approved' });

    await toolApprovals.approveToolCall(MOCK_JWT_TOKEN, 'ap1', 'Looks good');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals/${encodeURIComponent('ap1')}/approve`,
      method: 'POST',
      body: { note: 'Looks good' },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should reject tool call', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ status: 'rejected' });

    await toolApprovals.rejectToolCall(MOCK_JWT_TOKEN, 'ap1', 'Too risky');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals/${encodeURIComponent('ap1')}/reject`,
      method: 'POST',
      body: { note: 'Too risky' },
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should mark tool approval read', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue(undefined);

    await toolApprovals.markToolApprovalRead(MOCK_JWT_TOKEN, 'ap1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals/${encodeURIComponent('ap1')}/mark-read`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should mark tool approval unread', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue(undefined);

    await toolApprovals.markToolApprovalUnread(MOCK_JWT_TOKEN, 'ap1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals/${encodeURIComponent('ap1')}/mark-unread`,
      method: 'POST',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should delete tool approval', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue(undefined);

    await toolApprovals.deleteToolApproval(MOCK_JWT_TOKEN, 'ap1');

    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals/${encodeURIComponent('ap1')}`,
      method: 'DELETE',
      token: MOCK_JWT_TOKEN,
    });
  });

  it('should get pending approval count', async () => {
    vi.mocked(requestDatalayerAPI).mockResolvedValue({ count: 3 });

    const result = await toolApprovals.getPendingApprovalCount(MOCK_JWT_TOKEN);

    expect(result).toEqual({ count: 3 });
    expect(requestDatalayerAPI).toHaveBeenCalledWith({
      url: `${BASE}${PREFIX}/tool-approvals/pending/count`,
      method: 'GET',
      token: MOCK_JWT_TOKEN,
    });
  });
});
