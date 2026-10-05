/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * An emoji, drawn in Fluent Emoji (LOOP T-20): the same drawing on every
 * platform, from Datalayer's own bundle — no request leaves for anyone
 * else's. The drawing is a module of its own, fetched the first time the
 * emoji is drawn, and kept; until it lands, an empty box of its size holds
 * its place, so nothing moves when it does. An emoji Datalayer ships no
 * drawing of (`FACE_EMOJIS` lists the ones it does) is drawn by the system,
 * as text, at the same size.
 *
 * @module components/emoji/FluentEmoji
 */

import type { CSSProperties, JSX } from 'react';
import { useEffect, useState } from 'react';
import { emojiKey } from './faceEmojis';
import { FLUENT_EMOJI_LOADERS } from './fluent/loaders';

/** The drawings fetched so far, by key, as `data:` URLs. */
const DRAWN = new Map<string, string>();

/** Whether Datalayer ships a Fluent drawing of the emoji. */
export function hasFluentEmoji(emoji: string | undefined): boolean {
  return (
    !!emoji &&
    Object.prototype.hasOwnProperty.call(FLUENT_EMOJI_LOADERS, emojiKey(emoji))
  );
}

/**
 * The emoji's drawing, as a `data:` URL an `<img>` takes, or `undefined` when
 * Datalayer ships none.
 */
export async function loadFluentEmoji(
  emoji: string,
): Promise<string | undefined> {
  const key = emojiKey(emoji);
  const known = DRAWN.get(key);
  if (known) {
    return known;
  }
  if (!Object.prototype.hasOwnProperty.call(FLUENT_EMOJI_LOADERS, key)) {
    return undefined;
  }
  const svg = (await FLUENT_EMOJI_LOADERS[key]()).default;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  DRAWN.set(key, url);
  return url;
}

export type FluentEmojiProps = {
  emoji: string;
  /** Its edge, in pixels. */
  size: number;
  /**
   * What it is called, for a screen reader; the emoji itself by default.
   * Empty, it is decoration: whatever it sits in names it.
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export function FluentEmoji({
  emoji,
  size,
  label,
  className,
  style,
}: FluentEmojiProps): JSX.Element {
  const key = emojiKey(emoji);
  const shipped = hasFluentEmoji(emoji);
  const [url, setUrl] = useState<string | undefined>(() => DRAWN.get(key));

  useEffect(() => {
    let live = true;
    setUrl(DRAWN.get(key));
    if (shipped && !DRAWN.has(key)) {
      loadFluentEmoji(emoji).then(
        drawn => live && setUrl(drawn),
        // A chunk that fails to load leaves the box empty rather than the page
        // broken; the next draw tries again.
        () => undefined,
      );
    }
    return () => {
      live = false;
    };
  }, [key, shipped, emoji]);

  const name = label ?? emoji;
  const box: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
    width: size,
    height: size,
    ...style,
  };

  if (!shipped) {
    // The system's emoji, the only drawing there is of this one.
    return (
      <span
        className={className}
        role={name ? 'img' : undefined}
        aria-label={name || undefined}
        aria-hidden={name ? undefined : true}
        data-emoji="system"
        style={{ ...box, fontSize: Math.round(size * 0.85), lineHeight: 1 }}
      >
        {emoji}
      </span>
    );
  }
  if (!url) {
    return (
      <span
        className={className}
        aria-hidden="true"
        data-emoji="loading"
        style={box}
      />
    );
  }
  return (
    <img
      className={className}
      src={url}
      alt={name}
      aria-hidden={name ? undefined : true}
      width={size}
      height={size}
      draggable={false}
      data-emoji="fluent"
      style={{ ...box, display: 'inline-block' }}
    />
  );
}

export default FluentEmoji;
