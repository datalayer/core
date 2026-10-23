/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Who an account is, to be read: its avatar, then its username, display
 * name, initials, origin and identifier, the identifier with a button that
 * copies it.
 *
 * It is given the identity and fetches nothing, so any host draws it from
 * what it already holds: the web's profile page beside its form, VS Code's
 * Profile view from its signed-in user.
 *
 * @module views/profile/UserIdentity
 */

import type { JSX } from 'react';
import { Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { UserAvatar } from '../../components/avatars';
import { CopyToClipboardButton } from '../../components/buttons';

/** What {@link UserIdentity} shows of an account. */
export interface UserIdentityProfile {
  /** The account's identifier. */
  id?: string;
  username: string;
  display_name: string;
  initials: string;
  /** Its photograph, when it has one. */
  avatar_url?: string;
  /** Its chosen picture, which wins over the photograph. */
  avatar_icon?: string;
  /** Where the account comes from (the identity provider). */
  origin?: string;
}

export interface UserIdentityProps {
  identity: UserIdentityProfile;
  /** Whether the identifier is shown. @default true */
  displayId?: boolean;
  /**
   * Whether the display name and the initials are shown. They are computed
   * from the first and the last name, so a host showing the form that edits
   * those states them there instead. @default true
   */
  displayComputed?: boolean;
  /** Rendered under the avatar, typically the button changing it. */
  avatarAction?: JSX.Element;
}

/** One row of the list: its label, then its value. */
const Row = ({
  label,
  children,
}: {
  label: string;
  children: JSX.Element | string;
}): JSX.Element => (
  <>
    <Box p={1}>
      <Text style={{ fontWeight: 'bold' }}>{label}</Text>
    </Box>
    <Box p={1} display="flex" alignItems="center" gap={1}>
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Box>
  </>
);

export const UserIdentity = ({
  identity,
  displayId = true,
  displayComputed = true,
  avatarAction,
}: UserIdentityProps): JSX.Element => (
  <Box>
    <Box display="flex" flexDirection="column" alignItems="flex-start" gap={2}>
      <UserAvatar
        avatarUrl={identity.avatar_url}
        avatar={identity.avatar_icon}
        size={100}
      />
      {avatarAction}
    </Box>
    <Box
      display="grid"
      gridTemplateColumns="1fr 2fr"
      rowGap={3}
      columnGap={3}
      maxWidth={500}
      mt={3}
    >
      <Row label="Username">{identity.username}</Row>
      {displayComputed && (
        <>
          <Row label="Display name">{identity.display_name}</Row>
          <Row label="Initials">{identity.initials}</Row>
        </>
      )}
      {identity.origin && <Row label="Origin">{identity.origin}</Row>}
      {/*
       * The identifier, last: nobody knows an account by it, and it is what
       * one comes looking for when something has to be reported or matched,
       * so it carries the button that copies it.
       */}
      {displayId && identity.id && (
        <Row label="UID">
          <>
            <Text>{identity.id}</Text>
            <CopyToClipboardButton
              value={identity.id}
              ariaLabel="Copy the identifier of the account"
            />
          </>
        </Row>
      )}
    </Box>
  </Box>
);

export default UserIdentity;
