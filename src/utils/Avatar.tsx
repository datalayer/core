/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const DEFAULT_AVATAR_URL =
  'https://avatars.githubusercontent.com/u/70511875?s=200&v=4';

export const DEFAULT_AVATAR_URL_ENCODED =
  encodeURIComponent(DEFAULT_AVATAR_URL);

function stringToColor(string: string) {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.substr(-2);
  }
  return color;
}

export function stringAvatar(name: string) {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
  };
}

export function getAvatarURL(url?: string) {
  return url
    ? url.startsWith('https://www.gravatar.com/avatar')
      ? `${url}?v=4&s=200&d=${DEFAULT_AVATAR_URL_ENCODED}` // Use gravatar syntax - sizing works for Gravatar and GitHub
      : url
    : DEFAULT_AVATAR_URL; // This fallback should barely be used - hence we allow decoding the URI.
}
