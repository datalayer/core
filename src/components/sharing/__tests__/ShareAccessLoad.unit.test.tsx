/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Reading the sharing of a resource: the form leaves "Loading…" once the
 * service has answered, whatever re-rendered meanwhile, and a load that
 * failed is said where the sharing would be.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

vi.mock('../../../state', () => ({
  useIAMStore: () => ({ token: 'a-token', user: { uid: 'u1', roles: [] } }),
  // No IAM address: the principals to share with are not looked up here.
  useCoreStore: () => ({ configuration: {} }),
}));
vi.mock('../../../hooks', () => ({
  useToast: () => ({ enqueueToast: () => undefined }),
}));
vi.mock('../../principal/PrincipalAvatar', () => ({
  PrincipalAvatar: () => null,
}));
vi.mock('../../principal/PrincipalBadge', () => ({
  PrincipalBadge: () => null,
}));

import { ShareAccessComponent } from '../ShareAccessComponent';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const LOADING = 'Loading current sharing settings';
const URL_A = 'https://spacer.test/api/spacer/v1/spaces/A/sharing';
const URL_B = 'https://spacer.test/api/spacer/v1/spaces/B/sharing';

type Pending = { url: string; answer: (status: number, body: any) => void };

let container: HTMLDivElement;
let root: Root;
let pending: Pending[];

const share = (props: { requestUrl?: string; resourceName?: string }) => (
  <ShareAccessComponent
    isOpen
    displayMode="inline"
    resourceLabel="Space"
    onClose={() => undefined}
    {...props}
  />
);

const sharingOf = (teamUid: string) => ({
  success: true,
  sharing: {
    access: { view: { teamUids: [teamUid] } },
    owners: [{ kind: 'user', uid: 'u1' }],
  },
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  pending = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string) =>
        new Promise(resolve => {
          pending.push({
            url: String(url),
            answer: (status, body) =>
              resolve({
                ok: status >= 200 && status < 300,
                status,
                json: async () => body,
              }),
          });
        }),
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const text = () => container.textContent ?? '';

describe('ShareAccessComponent, reading the sharing', () => {
  it('leaves Loading when the answer arrives after a re-render', async () => {
    await act(async () => root.render(share({ requestUrl: URL_A })));
    expect(text()).toContain(LOADING);
    // The space's name arrives while the sharing is still being read.
    await act(async () =>
      root.render(share({ requestUrl: URL_A, resourceName: 'A space' })),
    );
    expect(pending.filter(p => p.url === URL_A)).toHaveLength(1);
    await act(async () => pending[0].answer(200, sharingOf('t1')));
    expect(text()).not.toContain(LOADING);
    expect(text()).not.toContain('could not be loaded');
  });

  it('reads again when the resource changes before the first answer', async () => {
    await act(async () => root.render(share({ requestUrl: URL_A })));
    await act(async () => root.render(share({ requestUrl: URL_B })));
    expect(pending.map(p => p.url)).toEqual([URL_A, URL_B]);
    // The dropped answer changes nothing; the second one ends the loading.
    await act(async () => pending[0].answer(200, sharingOf('t1')));
    expect(text()).toContain(LOADING);
    await act(async () => pending[1].answer(200, sharingOf('t2')));
    expect(text()).not.toContain(LOADING);
  });

  it('reads again after the address was withdrawn mid-flight', async () => {
    await act(async () => root.render(share({ requestUrl: URL_A })));
    await act(async () => root.render(share({})));
    expect(text()).not.toContain(LOADING);
    await act(async () => root.render(share({ requestUrl: URL_A })));
    expect(pending).toHaveLength(2);
    await act(async () => pending[1].answer(200, sharingOf('t1')));
    expect(text()).not.toContain(LOADING);
  });

  it('says a refusal on the page', async () => {
    await act(async () => root.render(share({ requestUrl: URL_A })));
    await act(async () =>
      pending[0].answer(403, {
        success: false,
        message: 'You are not authorized to read the sharing of this space.',
      }),
    );
    expect(text()).not.toContain(LOADING);
    expect(text()).toContain('Sharing access is restricted');
    expect(text()).toContain('You are not authorized to read the sharing');
  });

  it('says a failed load on the page', async () => {
    await act(async () => root.render(share({ requestUrl: URL_A })));
    await act(async () =>
      pending[0].answer(500, { success: false, message: 'Solr is down.' }),
    );
    expect(text()).not.toContain(LOADING);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'The sharing settings could not be loaded',
    );
    expect(text()).toContain('Solr is down.');
  });
});
