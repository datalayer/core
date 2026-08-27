/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DatalayerApi from '../../DatalayerApi';
import { getGatewayHealth, getGatewayVersion, getWorkflowsHealth, listWorkers } from '../operations';
import { MCP_GATEWAY_ROUTES } from '../generated';

const BASE = 'https://mcp.test/mcp';

describe('MCP operations API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reads version and liveness outside the versioned API and without a token', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({ version: '0.0.1', resource: 'https://mcp.test/mcp' })
      .mockResolvedValueOnce({ status: 'ok', version: '0.0.1' });

    const version = await getGatewayVersion(BASE);
    const health = await getGatewayHealth(BASE);

    expect(version.resource).toBe('https://mcp.test/mcp');
    expect(health.status).toBe('ok');
    expect(request).toHaveBeenNthCalledWith(1, { url: 'https://mcp.test/api/mcp/version', method: 'GET' });
    expect(request).toHaveBeenNthCalledWith(2, { url: 'https://mcp.test/api/mcp/healthz', method: 'GET' });
  });

  it('reads the worker directory and the engine health for platform administrators', async () => {
    const request = vi
      .spyOn(DatalayerApi, 'requestDatalayerAPI')
      .mockResolvedValueOnce({
        items: [{ uid: 'w1', user_uid: '01U', replica: 'gateway-1', state: 'running', working_tasks: 2, started_at: '2026-08-27T09:00:00Z' }],
        replica: 'gateway-0',
      })
      .mockResolvedValueOnce({
        engine: 'dbos',
        healthy: true,
        queues: [{ name: 'default', backlog: 0 }],
        worker_versions: { '2.1.0': 2 },
        checked_at: '2026-08-27T10:00:00Z',
      });

    const workers = await listWorkers('token', BASE);
    const workflows = await getWorkflowsHealth('token', BASE);

    expect(workers.items[0].workingTasks).toBe(2);
    expect(workflows.workerVersions['2.1.0']).toBe(2);
    expect(request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: 'https://mcp.test/api/mcp/v1/operations/workers' }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: 'https://mcp.test/api/mcp/v1/operations/workflows' }),
    );
  });

  it('carries the routes the gateway declares today', () => {
    const paths = MCP_GATEWAY_ROUTES.map(route => `${route.method} ${route.path}`);
    expect(paths).toContain('GET /api/mcp/version');
    expect(paths).toContain('GET /api/mcp/healthz');
    expect(paths).toContain('GET /.well-known/oauth-protected-resource/mcp');
  });
});
