/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  PRINCIPAL_AVATAR_ICONS,
  getPrincipalAvatarIcon,
} from '../PrincipalAppearance';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

/** Let the icon's own module arrive, and React commit what it draws. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }
}

describe('avatar icons, fetched on first draw', () => {
  it('still names every icon of the catalogue, and nothing else', () => {
    expect(PRINCIPAL_AVATAR_ICONS.length).toBe(65);
    expect(getPrincipalAvatarIcon('RobotIcon')).toBeTypeOf('function');
    expect(getPrincipalAvatarIcon('NoSuchIcon')).toBeUndefined();
    expect(getPrincipalAvatarIcon(undefined)).toBeUndefined();
  });

  it('holds the icon’s place at its size, then draws it', async () => {
    const Robot = getPrincipalAvatarIcon('RobotIcon')!;
    await act(async () => {
      root.render(<Robot size={40} />);
    });
    const placeholder = container.querySelector('span[aria-hidden="true"]');
    if (placeholder) {
      // Before the module lands: an empty box of the icon's size.
      expect((placeholder as HTMLElement).style.width).toBe('40px');
      expect((placeholder as HTMLElement).style.height).toBe('40px');
    }
    await settle();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it('is the same component each time it is asked for', () => {
    expect(getPrincipalAvatarIcon('DraftIcon')).toBe(
      getPrincipalAvatarIcon('DraftIcon'),
    );
  });
});
