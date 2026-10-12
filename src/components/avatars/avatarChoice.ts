/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The avatar a person, an organization, a team or an application chose, as it
 * is kept: one string, prefixed by what it is.
 *
 * - `emoji:👀` — an emoji, drawn in Fluent Emoji (`FluentEmoji`);
 * - `@datalayer/icons-react:RobotIcon` — a drawing of the avatar set
 *   (`PRINCIPAL_AVATAR_ICONS`), by its component name.
 *
 * Nothing else is an avatar: a bare name, an unknown prefix, an icon outside
 * the set or an emoji that is not one is refused, in a sentence.
 *
 * @module components/avatars/avatarChoice
 */

/** The prefix of an emoji avatar. */
export const AVATAR_EMOJI_PREFIX = 'emoji:';

/** The prefix of an avatar drawn from `@datalayer/icons-react`. */
export const AVATAR_ICON_PREFIX = '@datalayer/icons-react:';

/** What an avatar is: an emoji, or an icon of the set by name. */
export type AvatarChoice =
  { kind: 'emoji'; emoji: string } | { kind: 'icon'; name: string };

/** Why a value is not an avatar, in a sentence. */
export class AvatarRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarRefused';
  }
}

/** One emoji: a pictograph, optionally joined and varied, nothing else. */
const EMOJI =
  /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|‍|️|⃣)*$/u;

/** An icon component name of `@datalayer/icons-react`. */
const ICON_NAME = /^[A-Z][A-Za-z0-9]*Icon$/;

/**
 * The avatar a value names.
 *
 * `icons` is the set an icon must belong to (the names of
 * `PRINCIPAL_AVATAR_ICONS`); throws `AvatarRefused` for anything else.
 */
export function parseAvatar(
  value: string,
  icons: ReadonlySet<string>,
): AvatarChoice {
  if (value.startsWith(AVATAR_EMOJI_PREFIX)) {
    const emoji = value.slice(AVATAR_EMOJI_PREFIX.length);
    if (!emoji || emoji.length > 32 || !EMOJI.test(emoji)) {
      throw new AvatarRefused(`“${emoji}” is not an emoji.`);
    }
    return { kind: 'emoji', emoji };
  }
  if (value.startsWith(AVATAR_ICON_PREFIX)) {
    const name = value.slice(AVATAR_ICON_PREFIX.length);
    if (!ICON_NAME.test(name) || !icons.has(name)) {
      throw new AvatarRefused(`“${name}” is not an avatar of the set.`);
    }
    return { kind: 'icon', name };
  }
  throw new AvatarRefused(
    `An avatar is “${AVATAR_EMOJI_PREFIX}…” or “${AVATAR_ICON_PREFIX}…”, not “${value}”.`,
  );
}

/** The value an avatar is kept as. */
export function avatarValue(choice: AvatarChoice): string {
  return choice.kind === 'emoji'
    ? `${AVATAR_EMOJI_PREFIX}${choice.emoji}`
    : `${AVATAR_ICON_PREFIX}${choice.name}`;
}

/** An emoji, as an avatar value. */
export const emojiAvatar = (emoji: string): string =>
  `${AVATAR_EMOJI_PREFIX}${emoji}`;

/** An icon of the set, by its component name, as an avatar value. */
export const iconAvatar = (name: string): string =>
  `${AVATAR_ICON_PREFIX}${name}`;
