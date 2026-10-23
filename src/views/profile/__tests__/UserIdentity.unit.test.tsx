/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Who an account is, drawn from the identity it is given: nothing fetched.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { UserIdentity } from '../UserIdentity';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const identity = {
  id: '01JV1VE1T5VG22Z05F6EFBMWAB',
  username: 'eric',
  display_name: 'Eric Charles',
  initials: 'EC',
  origin: 'github',
};

describe('UserIdentity', () => {
  it('says who the account is, its identifier with a copy button', () => {
    act(() => root.render(<UserIdentity identity={identity} />));
    const text = container.textContent ?? '';
    for (const said of ['eric', 'Eric Charles', 'EC', 'github', identity.id]) {
      expect(text).toContain(said);
    }
    expect(
      container.querySelector(
        '[aria-label="Copy the identifier of the account"]',
      ),
    ).not.toBeNull();
  });

  it('leaves out what its host says elsewhere', () => {
    act(() =>
      root.render(
        <UserIdentity
          identity={{ ...identity, origin: undefined }}
          displayId={false}
          displayComputed={false}
        />,
      ),
    );
    const text = container.textContent ?? '';
    expect(text).toContain('eric');
    expect(text).not.toContain('Eric Charles');
    expect(text).not.toContain('Origin');
    expect(text).not.toContain(identity.id);
  });
});
