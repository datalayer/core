/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The Overview's Tools and Reach cards: each opens its page, and says what
 * that page shows. An application that has no such page keeps the words and
 * is not given a dead link.
 *
 * @module views/mcp/__tests__/mcpHomeSummaries.unit.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { McpRoutes } from '../types';

const navigate = vi.fn();

vi.mock('../../../hooks/useMcp', () => {
  const empty = { data: undefined };
  return {
    useConnectedAgents: () => empty,
    useMcpActivity: () => empty,
    useMcpMetrics: () => empty,
    useTasks: () => empty,
  };
});
vi.mock('../../../hooks', () => ({ useNavigate: () => navigate }));
vi.mock('../../../state', () => ({
  useCoreStore: (select: (state: unknown) => unknown) =>
    select({ configuration: { datalayerMcpServerUrl: '' } }),
  useIAMStore: (select: (state: unknown) => unknown) =>
    select({ token: 'a-token' }),
}));
vi.mock('@datalayer/icons-react', () => ({ AiAgentIcon: () => null }));

import { McpHome } from '../McpHome';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const ROUTES: McpRoutes = {
  dashboard: '/mcp',
  access: '/mcp/access',
  audit: '/mcp/audit',
  runs: '/mcp/runs',
  observability: '/mcp/observability',
  agents: '/mcp/agents',
  policies: '/mcp/policies',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  navigate.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const draw = (routes: McpRoutes) =>
  act(() =>
    root.render(
      <McpHome
        routes={routes}
        showSetup={false}
        onOpenDocs={() => undefined}
      />,
    ),
  );

const link = (to: string) =>
  container.querySelector<HTMLAnchorElement>(`a[href="${to}"]`);

const action = (label: string) =>
  [...container.querySelectorAll('button')].find(
    button => button.textContent === label,
  );

describe('The Tools and Reach summaries', () => {
  it('opens each page from its title', () => {
    draw({ ...ROUTES, tools: '/mcp/tools', reach: '/mcp/reach' });
    expect(link('/mcp/tools')?.textContent).toBe('Tools');
    expect(link('/mcp/reach')?.textContent).toBe('Reach');

    act(() => link('/mcp/tools')?.click());
    expect(navigate).toHaveBeenLastCalledWith('/mcp/tools');
  });

  it('opens each page from its action', () => {
    draw({ ...ROUTES, tools: '/mcp/tools', reach: '/mcp/reach' });

    act(() => action('What each agent may execute')?.click());
    expect(navigate).toHaveBeenLastCalledWith('/mcp/tools');

    act(() => action('What each agent reaches')?.click());
    expect(navigate).toHaveBeenLastCalledWith('/mcp/reach');
  });

  it('says what the pages show, not what is to come', () => {
    draw({ ...ROUTES, tools: '/mcp/tools', reach: '/mcp/reach' });
    const text = container.textContent ?? '';
    expect(text).toContain('The toolsets each of your agents may execute');
    expect(text).toContain('can actually reach');
    expect(text).not.toMatch(/once .* ships?|arrives with/);
  });

  it('gives no link where the application has no page', () => {
    draw(ROUTES);
    expect(container.textContent).toContain('Tools');
    expect(link('undefined')).toBeNull();
    expect(action('What each agent may execute')).toBeUndefined();
    expect(action('What each agent reaches')).toBeUndefined();
  });
});
