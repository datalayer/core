/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Avatar, type AvatarProps } from '@primer/react';
import { getAvatarURL } from '../../utils';

/**
 * Props for {@link DLAvatar}.
 *
 * Same as Primer's `AvatarProps` but `src` accepts the raw avatar URL
 * (e.g. `user.avatar_url_s`) and is run through {@link getAvatarURL}
 * so Gravatar fallbacks and the default avatar are handled consistently.
 */
export type DLAvatarProps = Omit<AvatarProps, 'src'> & {
  src?: string;
};

/**
 * Datalayer Avatar wrapper.
 *
 * Centralizes two concerns for every avatar rendered in our apps:
 *
 *  - URL normalization via {@link getAvatarURL} (handles Gravatar query
 *    parameters and the default avatar fallback).
 *  - `referrerPolicy="no-referrer"` so that third-party CDNs such as
 *    `lh3.googleusercontent.com` (Google), LinkedIn media, etc. do not
 *    deny the request based on the `Referer` header.
 */
export const DLAvatar = ({ src, ...rest }: DLAvatarProps) => {
  return (
    <Avatar
      src={getAvatarURL(src)}
      referrerPolicy="no-referrer"
      {...rest}
    />
  );
};

export default DLAvatar;
