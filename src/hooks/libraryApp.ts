/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What the Library says of a published application beyond any item's fields:
 * its face, its kind and whether it runs live.
 *
 * Spacer keeps them beside the app's item, from its Appspec, and the Library
 * projection carries them: `face_s` (the JSON of its `id`, `emoji`, `avatar`
 * and `banner`, each only when set), `app_kind_s` and `runs_live_b` — an app
 * that runs live can be tried before it is cloned: not a decision, and naming
 * the agent it runs on.
 *
 * @module hooks/libraryApp
 */

/** The kinds of application. */
export const LIBRARY_APP_KINDS = [
  'decision',
  'chat',
  'widget',
  'worker',
] as const;

export type LibraryAppKind = (typeof LIBRARY_APP_KINDS)[number];

/** An application's face, as its Appspec says it: each only when set. */
export type LibraryAppFace = {
  /** The Appspec's id: what seeds its banner, and the agent it runs as. */
  id?: string;
  emoji?: string;
  /** The drawing chosen, by name, from the profile's set. */
  avatar?: string;
  /** The banner chosen, by name, from the profile's set. */
  banner?: string;
};

export type LibraryAppFields = {
  /** None when the Library answered without one. */
  face?: LibraryAppFace;
  /** None when the Library answered without one. */
  appKind?: LibraryAppKind;
  /** Whether it can be tried before it is cloned. */
  runsLive: boolean;
};

const FACE_KEYS = ['id', 'emoji', 'avatar', 'banner'] as const;

/** The face `face_s` carries; a value that is not a face's JSON is refused. */
export function libraryAppFaceOf(value: unknown): LibraryAppFace | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`An app's face is not a string: ${String(value)}`);
  }
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`An app's face is not an object: ${value}`);
  }
  const face: LibraryAppFace = {};
  for (const key of FACE_KEYS) {
    const field = (parsed as Record<string, unknown>)[key];
    if (typeof field === 'string' && field) {
      face[key] = field;
    }
  }
  return face;
}

/** The face, kind and liveness of an app as the Library answers it. */
export function libraryAppFieldsOf(
  raw: Record<string, unknown>,
): LibraryAppFields {
  const kind = raw.app_kind_s;
  if (
    kind !== undefined &&
    !(LIBRARY_APP_KINDS as readonly unknown[]).includes(kind)
  ) {
    throw new Error(
      `An app's kind is not one of ${LIBRARY_APP_KINDS}: ${String(kind)}`,
    );
  }
  const face = libraryAppFaceOf(raw.face_s);
  return {
    ...(face ? { face } : {}),
    ...(kind ? { appKind: kind as LibraryAppKind } : {}),
    runsLive: raw.runs_live_b === true,
  };
}
