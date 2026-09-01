/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A sandbox is identified by its uid, never by its runtime's Pod name.
 *
 * A Datalayer runtime has a ULID; its Kubernetes Pod is named
 * `runtime-<ulid>`, because a Pod name has to be a DNS label. Route
 * parameters and `runtime_name` fields carry the Pod name, and every Contents
 * record keyed on a sandbox is keyed on the ULID.
 *
 * Passing the Pod name where a uid belongs used to *work* at the call site
 * and fail far away: Contents validates `sandbox_uid` while building its
 * reply, so a Pod name became an unhandled 500 that reached the browser as
 * "Network Error", with nothing readable in it and nothing pointing at the
 * caller. Throwing here names the caller in the stack instead.
 *
 * The server half of this is `datalayer_common.runtime_names`.
 */

/** What a runtime Pod's name is prefixed with. */
export const RUNTIME_NAME_PREFIX = 'runtime-';

/** Thrown when a Pod name is given where a sandbox uid is required. */
export class RuntimeNameNotAUid extends Error {
  readonly value: string;

  constructor(value: string) {
    super(
      `'${value}' is a runtime Pod name, not a sandbox uid. A sandbox is ` +
        `identified by its ULID ('${value.slice(RUNTIME_NAME_PREFIX.length)}'). ` +
        'If all you hold is the Pod name, convert it deliberately with ' +
        'sandboxUidFromRuntimeName().',
    );
    this.name = 'RuntimeNameNotAUid';
    this.value = value;
  }
}

/**
 * Assert that a value is a sandbox uid, and return it.
 *
 * Use this wherever a `sandbox_uid` is sent. A non-Datalayer identifier —
 * Daytona, E2B and Modal name their own sandboxes — passes through: there is
 * no ULID to check it against, and inventing one would be worse.
 */
export function assertSandboxUid(value: string): string {
  if (value.startsWith(RUNTIME_NAME_PREFIX)) {
    throw new RuntimeNameNotAUid(value);
  }
  return value;
}

/**
 * The Pod name for a sandbox uid, converting on purpose.
 *
 * The mirror of {@link sandboxUidFromRuntimeName}, and the direction that was
 * missing: route parameters and `runtime_name` fields carry the **Pod name**,
 * so anything addressing `/runtimes/{name}/…` needs one. Without this, a
 * caller holding only a uid either wrote the prefix itself or — the version
 * that was here — passed the uid and hoped, which is a `404` from a route
 * whose parameter looked plausible.
 *
 * Idempotent, like the server's `runtime_name()`: a name that has been
 * through here stays one name rather than growing a second prefix.
 */
export function runtimeNameFromSandboxUid(value: string): string {
  if (!value || value.startsWith(RUNTIME_NAME_PREFIX)) {
    return value;
  }
  return `${RUNTIME_NAME_PREFIX}${value}`;
}

/**
 * The sandbox uid for a Pod name, converting on purpose.
 *
 * For the few callers that genuinely only hold the Pod name — a route
 * parameter, a label read off a Pod. Everywhere else should already have the
 * uid, and {@link assertSandboxUid} is what says so.
 */
export function sandboxUidFromRuntimeName(value: string): string {
  return value.startsWith(RUNTIME_NAME_PREFIX)
    ? value.slice(RUNTIME_NAME_PREFIX.length)
    : value;
}
