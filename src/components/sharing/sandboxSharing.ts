/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Where a sandbox's sharing lives.
 *
 * A sandbox is a runtime underneath, and Runtimes owns who it is shared with:
 * `GET|PUT /api/runtimes/v1/runtimes/{name}/sharing`, answering an `access`
 * document in exactly the shape `ShareAccessDialog` reads. So the dialog
 * talks to Runtimes directly and there is no transport to write.
 *
 * The one thing worth a function of its own is **which name**. A sandbox has
 * two: the handle its session holds (`sb_…`) and the runtime's own, and
 * Runtimes' routes take the second. Sending the first gets a `403` that reads
 * as "you are not the owner" — the confusion that made the CLI's sharing
 * commands unusable until September 2026, and the reason this is written down
 * once rather than spelled out at each call site.
 *
 * @module components/sharing/sandboxSharing
 */

/**
 * The sharing URL for a sandbox, or `undefined` when there is nothing to ask.
 *
 * Answers `undefined` rather than a broken URL for a sandbox with no runtime
 * behind it — a browser or local kernel, or a binding still reserving — so a
 * caller can use the answer itself to decide whether to offer sharing at all.
 */
export const sandboxSharingUrl = (
  runtimesUrl: string | undefined | null,
  runtimeName: string | undefined | null,
): string | undefined => {
  const base = String(runtimesUrl ?? '').trim();
  const name = String(runtimeName ?? '').trim();
  if (!base || !name) {
    return undefined;
  }
  return `${base.replace(/\/+$/, '')}/api/runtimes/v1/runtimes/${encodeURIComponent(name)}/sharing`;
};

export default sandboxSharingUrl;
