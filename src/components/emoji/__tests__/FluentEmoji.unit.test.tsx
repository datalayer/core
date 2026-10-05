/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FACE_EMOJIS, emojiKey } from '../faceEmojis';
import { FluentEmoji, hasFluentEmoji, loadFluentEmoji } from '../FluentEmoji';
import { FLUENT_EMOJI_LOADERS } from '../fluent/loaders';
import { UserAvatar } from '../../avatars/UserAvatar';
import { PrincipalAvatar } from '../../principal/PrincipalAvatar';

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

/** Let the drawing's own module arrive, and React commit what it draws. */
async function settle(): Promise<void> {
  for (let i = 0; i < 50 && !container.querySelector('img'); i += 1) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
}

describe('the faces offered, each drawn in Fluent Emoji (LOOP T-20)', () => {
  it('ships a drawing of every emoji offered, and of nothing else', () => {
    const offered = FACE_EMOJIS.map(emojiKey);
    expect(offered.filter(key => !(key in FLUENT_EMOJI_LOADERS))).toEqual([]);
    expect(Object.keys(FLUENT_EMOJI_LOADERS).sort()).toEqual(
      [...new Set(offered)].sort(),
    );
    // No emoji offered twice.
    expect(new Set(offered).size).toBe(FACE_EMOJIS.length);
  });

  it('starts every application with the eyes, which it draws', () => {
    expect(hasFluentEmoji('👀')).toBe(true);
  });

  it('every drawing is an SVG of its own, from the bundle', async () => {
    for (const [key, load] of Object.entries(FLUENT_EMOJI_LOADERS)) {
      const svg = (await load()).default;
      expect(svg.startsWith('<svg'), key).toBe(true);
      expect(svg.endsWith('</svg>'), key).toBe(true);
      // Nothing it draws is fetched from anyone's origin.
      expect(/(?:href|src)="https?:/.test(svg), key).toBe(false);
    }
  });

  it('files an emoji under its code points, with or without U+FE0F', () => {
    expect(emojiKey('👀')).toBe('1f440');
    expect(emojiKey('🎙️')).toBe('1f399');
    expect(emojiKey('🎙')).toBe('1f399');
    expect(emojiKey('🧑‍🚀')).toBe('1f9d1-200d-1f680');
    expect(hasFluentEmoji('☁')).toBe(true);
    expect(hasFluentEmoji(undefined)).toBe(false);
  });

  it('draws the Fluent drawing at the size asked, as an image', async () => {
    await act(async () => {
      root.render(<FluentEmoji emoji="🤖" size={40} />);
    });
    await settle();
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(img.getAttribute('width')).toBe('40');
    expect(img.alt).toBe('🤖');
    expect(img.dataset.emoji).toBe('fluent');
    expect(await loadFluentEmoji('🤖')).toBe(img.getAttribute('src'));
  });

  it('draws an emoji it ships no drawing of as text, at the same size', async () => {
    expect(hasFluentEmoji('🦖')).toBe(false);
    await act(async () => {
      root.render(<FluentEmoji emoji="🦖" size={40} />);
    });
    const span = container.querySelector(
      '[data-emoji="system"]',
    ) as HTMLElement;
    expect(span.textContent).toBe('🦖');
    expect(span.style.width).toBe('40px');
    expect(container.querySelector('img')).toBeNull();
  });

  it('draws an emoji face on its disc, in Fluent', async () => {
    await act(async () => {
      root.render(<UserAvatar avatarEmoji="🚀" size={72} square={false} />);
    });
    await settle();
    const disc = container.querySelector('[role="img"]') as HTMLElement;
    expect(disc.getAttribute('aria-label')).toBe('🚀');
    const img = disc.querySelector('img') as HTMLImageElement;
    expect(img.dataset.emoji).toBe('fluent');
    expect(img.getAttribute('width')).toBe(String(Math.round(72 * 0.6)));
    expect(disc.textContent).toBe('');
  });

  it("draws an application's emoji face at T-19's sizes", async () => {
    for (const size of [72, 40, 20]) {
      await act(async () => {
        root.render(
          <PrincipalAvatar kind="service" avatarEmoji="👀" size={size} />,
        );
      });
      await settle();
      const img = container.querySelector('img') as HTMLImageElement;
      expect(img.dataset.emoji).toBe('fluent');
      expect(Number(img.getAttribute('width'))).toBe(
        Math.max(12, Math.round(size * 0.62)),
      );
    }
  });
});
