/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The emojis a face is offered in, each drawn in Fluent Emoji (LOOP T-20).
 *
 * A native emoji is a different drawing on every platform, and missing on
 * some: an application's face has to be the same face for its builder and
 * its users. These are the ones Datalayer ships a drawing of, served from its
 * own bundle — the face every new application starts with (the eyes), every
 * example's, the emoji of each avatar of the profile's set that has one, and
 * the ones *Describe it* chooses from. Any other emoji is still accepted, and
 * is drawn by the system, as text.
 *
 * `scripts/generate-fluent-emoji.py` reads this list, between the two
 * markers, and writes a drawing for each: adding an emoji here means running
 * it again. `faceEmojis.unit.test.ts` fails when one has none.
 *
 * @module components/emoji/faceEmojis
 */

// fluent-emoji:start
export const FACE_EMOJIS: ReadonlyArray<string> = [
  // The face of an application that has not chosen one: the eyes of L👀P.
  '👀',
  // The examples' (agentspecs/apps).
  '📑',
  '🎙️',
  '🚢',
  '🚚',
  '🔎',
  '📬',
  '📈',
  '🧹',
  '🧠',
  '🛟',
  '🧮',
  // The avatars of the profile's set, as emoji.
  '👾',
  '👽',
  '🧑‍🚀',
  '⚛️',
  '🏦',
  '✒️',
  '💼',
  '🏛️',
  '🏗️',
  '🏢',
  '🎯',
  '☁️',
  '🚧',
  '👷',
  '🤠',
  '🧬',
  '🐲',
  '🐉',
  '🧝',
  '🔥',
  '🎆',
  '🛸',
  '🍀',
  '🎓',
  '😀',
  '🏠',
  '🦎',
  '🪄',
  '🧑‍💼',
  '🧑‍💻',
  '🎵',
  '🥷',
  '👐',
  '🖊️',
  '🐧',
  '🏄',
  '🏊',
  '🖼️',
  '🌄',
  '🛫',
  '🪐',
  '🤖',
  '🚀',
  '🎅',
  '🛰️',
  '🧑‍🔬',
  '🦈',
  '☃️',
  '🎇',
  '⭐',
  '🧑‍🎓',
  '☀️',
  '👋',
  '🐳',
  '🎁',
  '✍️',
  '☯️',
  // Work, and the things an application does it with.
  '📊',
  '📝',
  '📅',
  '🗓️',
  '📚',
  '💡',
  '🔧',
  '🛠️',
  '🧰',
  '⚙️',
  '🧪',
  '🔬',
  '🗂️',
  '📦',
  '🛒',
  '🚲',
  '💬',
  '📣',
  '🧾',
  '💰',
  '💳',
  '🌍',
  '🔒',
  '🔑',
  '🛡️',
  '🧭',
  '🗺️',
  '📰',
  '✉️',
  '📞',
  '🤝',
  '🏥',
  '⚖️',
  '🎨',
  '🎬',
  '📷',
  '🧑‍🏫',
  '🧑‍⚕️',
  '🧑‍🍳',
  '🧑‍🌾',
  '🌱',
  '🐝',
  '🦉',
  '🦊',
  '🐙',
  '❤️',
  '✅',
  '⏰',
  '🔔',
  '🧩',
  '🏷️',
  '📋',
  '📌',
  '🔍',
  '🙂',
  '🤓',
  '🧐',
  '😎',
  '🦄',
  '🐶',
  '🐱',
  '🌈',
  '🌟',
  '⚡',
  '🍕',
  '☕',
  '🎉',
  '🏆',
];
// fluent-emoji:end

/**
 * The key a drawing is filed under: the emoji's code points, in lower-case
 * hexadecimal, joined by `-` — without the variation selector (U+FE0F), which
 * one keyboard types and another does not, for the same emoji.
 */
export function emojiKey(emoji: string): string {
  return Array.from(emoji.trim())
    .map(char => char.codePointAt(0) ?? 0)
    .filter(code => code !== 0xfe0f)
    .map(code => code.toString(16))
    .join('-');
}
