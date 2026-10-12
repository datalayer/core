/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  ChosenAvatar,
  PRINCIPAL_AVATAR_ICONS,
  PRINCIPAL_AVATAR_ICON_NAMES,
  parsePrincipalAvatar,
  principalAvatarOf,
} from '../PrincipalAppearance';
import {
  AvatarRefused,
  emojiAvatar,
  iconAvatar,
} from '../../avatars/avatarChoice';

const iconOf = (name: string) =>
  PRINCIPAL_AVATAR_ICONS.find(option => option.name === name)?.Icon;

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
    expect(PRINCIPAL_AVATAR_ICON_NAMES.has('RobotIcon')).toBe(true);
    expect(iconOf('RobotIcon')).toBeTypeOf('function');
  });

  it('holds the icon’s place at its size, then draws it', async () => {
    const Robot = iconOf('RobotIcon')!;
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
    expect(iconOf('DraftIcon')).toBe(iconOf('DraftIcon'));
  });
});

describe('an avatar is kept prefixed by what it is', () => {
  it('reads an emoji and an icon of the set, and refuses anything else', () => {
    expect(parsePrincipalAvatar('emoji:🚀')).toEqual({
      kind: 'emoji',
      emoji: '🚀',
    });
    expect(parsePrincipalAvatar('emoji:👩‍💻')).toEqual({
      kind: 'emoji',
      emoji: '👩‍💻',
    });
    expect(parsePrincipalAvatar('@datalayer/icons-react:RobotIcon')).toEqual({
      kind: 'icon',
      name: 'RobotIcon',
    });
    for (const refused of [
      'RobotIcon',
      'emoji:',
      'emoji:abc',
      '@datalayer/icons-react:NoSuchIcon',
      '@datalayer/icons-react:robot',
      'icon:RobotIcon',
    ]) {
      expect(() => parsePrincipalAvatar(refused)).toThrow(AvatarRefused);
    }
    expect(emojiAvatar('👀')).toBe('emoji:👀');
    expect(iconAvatar('RobotIcon')).toBe('@datalayer/icons-react:RobotIcon');
    expect(principalAvatarOf(undefined)).toBeUndefined();
  });

  it('draws an emoji or an icon from the one value, and nothing for a refused one', async () => {
    await act(async () => {
      root.render(<ChosenAvatar avatar="emoji:🚀" size={32} />);
    });
    await settle();
    expect(container.querySelector('[data-emoji]')).not.toBeNull();
    await act(async () => {
      root.render(
        <ChosenAvatar avatar="@datalayer/icons-react:RobotIcon" size={32} />,
      );
    });
    await settle();
    expect(container.querySelector('svg')).not.toBeNull();
    const error = console.error;
    console.error = () => undefined;
    try {
      await act(async () => {
        root.render(<ChosenAvatar avatar="RobotIcon" size={32} />);
      });
    } finally {
      console.error = error;
    }
    expect(container.innerHTML).toBe('');
  });
});
