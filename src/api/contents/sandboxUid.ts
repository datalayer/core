/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A sandbox is identified by its uid, a ULID.
 *
 * A Datalayer runtime has one name: its uid. The Pod is called by it, the
 * `runtime_name` field and every `/runtimes/{uid}` route carry it, and
 * Contents keys an attachment on it. There used to be a second spelling — a
 * Pod name `runtime-<ulid>` — and every place the two met needed a
 * converter; the converters went with the prefix.
 *
 * The server half of this is `datalayer_common.runtime_names`.
 */

/** Crockford base32, 26 characters — a ULID, in either case. */
export const SANDBOX_UID_PATTERN = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;

/**
 * Whether a value is a sandbox uid.
 *
 * What tells a runtime apart from anything else that can stand in a route:
 * an agentspec id, a word the listing itself addresses. A sandbox at an
 * external provider is named `external-<provider>-<uid>` and is not one.
 */
export function isSandboxUid(value: string | undefined | null): boolean {
  return !!value && SANDBOX_UID_PATTERN.test(value);
}
