/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** The signed-in person, as a shell needs one. */
export type Person = {
  uid: string;
  handle: string;
  displayName: string;
  avatarIcon?: string;
};

/** The person in IAM's `GET /api/iam/v1/me` answer (`me`); undefined without a uid and a handle. */
export function personOf(raw: unknown): Person | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const user = raw as Record<string, unknown>;
  const handle = typeof user.handle_s === 'string' ? user.handle_s : '';
  const uid = typeof user.uid === 'string' ? user.uid : '';
  if (!handle || !uid) {
    return undefined;
  }
  const names = [user.first_name_t, user.last_name_t].filter(
    (part): part is string => typeof part === 'string' && part.trim() !== '',
  );
  return {
    uid,
    handle,
    displayName: names.length ? names.join(' ') : handle,
    avatarIcon:
      typeof user.avatar_icon_s === 'string' ? user.avatar_icon_s : undefined,
  };
}
