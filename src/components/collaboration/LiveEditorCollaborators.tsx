/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The faces on a shared document: who is here now, and who belongs here.
 *
 * One avatar stack for every surface that names collaborators — the cards of
 * the home page, the headers of the notebook and document editors, in the
 * web application and in JupyterLab alike. Two sources feed it, both
 * optional and freely combined:
 *
 * - `awareness`: the presence channel of a collaborative editor. The stack
 *   follows it live — people appear as they join and leave as they go.
 * - `collaborators`: what is known without a room, the owner and the granted
 *   of an item. They fill the stack when there is no presence, and complete
 *   it when there is.
 *
 * Every face uses the shared principal avatar rules: a selected icon wins,
 * then a connected-account picture, then the standard personal fallback.
 *
 * @module components/collaboration/LiveEditorCollaborators
 */

import { useEffect, useMemo, useState } from 'react';
import { AvatarStack } from '@primer/react';
import { PrincipalAvatar } from '../principal/PrincipalAvatar';
import { PrincipalHoverCard } from '../principal/PrincipalHoverCard';

export type LiveCollaborator = {
  /** Stable identity — a user uid, or the awareness client id. */
  id: string;
  name: string;
  avatarUrl?: string;
  avatarIcon?: string;
  /** Cursor color of the presence, worn by the initials disc. */
  color?: string;
  /** The platform uid, when the face is a real account — for its profile. */
  uid?: string;
  /** The account handle, when known — the address of the profile page. */
  handle?: string;
};

/**
 * The slice of a Yjs-style awareness this component reads. Structural, so
 * any provider — Jupyter collaboration, Datalayer spacer — fits without a
 * dependency on its package.
 */
export type IAwarenessLike = {
  getStates(): Map<number, Record<string, any>>;
  on(event: 'change', handler: () => void): void;
  off(event: 'change', handler: () => void): void;
};

/** The `user` field of an awareness state, in its several spellings. */
function collaboratorOfState(
  clientId: number,
  state: Record<string, any>
): LiveCollaborator | undefined {
  const user = state?.user;
  if (!user) {
    return undefined;
  }
  // Not a person: the presence of the collaboration service itself — the
  // spacer joins its own rooms, wearing an `agent` field.
  if (user.agent) {
    return undefined;
  }
  const name: string =
    user.display_name || user.displayName || user.name || user.username || '';
  if (!name) {
    return undefined;
  }
  // Nobody either: the seed identity of a Jupyter Server that does not
  // authenticate its users — "Anonymous Hegemone" and kin. A face for it
  // would be one avatar too many, wearing the default fallback, next to the
  // real identity written over it a moment later.
  if (user.anonymous === true || /^anonymous(\s|$)/i.test(name)) {
    return undefined;
  }
  const uid = user.uid ?? user.id ?? undefined;
  // The room writes the uid into `username` as often as it writes a handle;
  // only take it for the handle when it is not just the uid under another
  // name, or the profile link would carry a uid where a handle belongs.
  const username =
    user.username && String(user.username) !== String(uid ?? '')
      ? user.username
      : undefined;
  return {
    id: String(uid ?? user.username ?? clientId),
    name,
    avatarUrl: user.avatar_url || user.avatarUrl || undefined,
    avatarIcon: user.avatar_icon_s || user.avatarIcon || undefined,
    color: user.color || undefined,
    uid: uid ? String(uid) : undefined,
    handle: user.handle || username || undefined
  };
}

/**
 * Fold a second sighting of a person into the first, keeping the fuller of
 * the two. The name that wins is the one belonging to the record that also
 * carries a uid — the identity a profile is named by, "Eric Charles" over
 * the room's cursor label "eric" — and every other field is taken wherever it
 * is present. The cursor color of the live presence, seen first, is kept.
 */
function mergeCollaborators(
  known: LiveCollaborator,
  incoming: LiveCollaborator
): LiveCollaborator {
  const incomingNameWins =
    !!incoming.uid && !known.uid && incoming.name.trim().length > 0;
  return {
    id: known.id,
    name: incomingNameWins ? incoming.name : known.name,
    uid: known.uid || incoming.uid,
    handle: known.handle || incoming.handle,
    avatarUrl: known.avatarUrl || incoming.avatarUrl,
    avatarIcon: known.avatarIcon || incoming.avatarIcon,
    color: known.color || incoming.color,
  };
}

export type LiveEditorCollaboratorsProps = {
  /** The presence of the room, followed live when given. */
  awareness?: IAwarenessLike | null;
  /** The collaborators known without a room — owner and granted. */
  collaborators?: LiveCollaborator[];
  /** Diameter of a face, in pixels. */
  size?: number;
  /** How many faces at most; the stack keeps the first ones. */
  max?: number;
  /**
   * Show a face's profile some other way than through the router of this
   * subtree — for the editors embedded under a router of their own, which hand
   * the route to the view that has the routes. See
   * {@link PrincipalDetailsOverlayProps.onNavigate}.
   */
  onNavigate?: (path: string) => void;
};

export function LiveEditorCollaborators(
  props: LiveEditorCollaboratorsProps
): JSX.Element | null {
  const {
    awareness,
    collaborators = [],
    max = 5,
    size = 24,
    onNavigate,
  } = props;
  const [present, setPresent] = useState<LiveCollaborator[]>([]);

  useEffect(() => {
    if (!awareness) {
      setPresent([]);
      return;
    }
    const read = () => {
      const seen = new Map<string, LiveCollaborator>();
      awareness.getStates().forEach((state, clientId) => {
        const collaborator = collaboratorOfState(clientId, state);
        // One face per person, however many tabs they have open.
        if (collaborator && !seen.has(collaborator.id)) {
          seen.set(collaborator.id, collaborator);
        }
      });
      setPresent(Array.from(seen.values()));
    };
    read();
    awareness.on('change', read);
    return () => {
      awareness.off('change', read);
    };
  }, [awareness]);

  const faces = useMemo(() => {
    // Who is here leads; who merely belongs completes. One person, though,
    // arrives more than once and never quite the same: the room knows them by
    // their handle and a cursor name ("eric"), the grants by their uid and
    // their full name ("Eric Charles"). Neither their id nor their name is
    // shared, so a fold on either alone leaves two faces of one person — and
    // two faces means two hover cards over the one avatar. So they are folded
    // on ANY identity they have in common — uid, handle, name, or id — and the
    // fuller of the two records is the one that survives.
    const list: LiveCollaborator[] = [];
    const indexByToken = new Map<string, number>();
    const tokensOf = (person: LiveCollaborator): string[] => {
      const tokens: string[] = [];
      if (person.uid) {
        tokens.push(`uid:${person.uid}`);
      }
      if (person.handle) {
        tokens.push(`handle:${person.handle.trim().toLowerCase()}`);
      }
      const nameKey = person.name.trim().toLowerCase();
      if (nameKey) {
        tokens.push(`name:${nameKey}`);
      }
      tokens.push(`id:${person.id}`);
      return tokens;
    };
    for (const person of [...present, ...collaborators]) {
      const tokens = tokensOf(person);
      let index = -1;
      for (const token of tokens) {
        const found = indexByToken.get(token);
        if (found !== undefined) {
          index = found;
          break;
        }
      }
      if (index === -1) {
        index = list.length;
        list.push({ ...person });
      } else {
        list[index] = mergeCollaborators(list[index], person);
      }
      // Every identity this person carries now points at their one face, so
      // the next record that shares any of them folds in rather than doubling.
      for (const token of [...tokens, ...tokensOf(list[index])]) {
        if (!indexByToken.has(token)) {
          indexByToken.set(token, index);
        }
      }
    }
    return list.slice(0, max);
  }, [collaborators, max, present]);

  if (!faces.length) {
    return null;
  }
  return (
    /*
     * Expanding to the LEFT.
     *
     * A stack of faces spreads out on hover, and it spreads from where it is
     * anchored: anchored on its left, it grew rightwards over whatever the
     * toolbar holds next to it. `alignRight` anchors it on its right, so it
     * opens back over the space it came from — empty by construction, since
     * the stack was collapsed there a moment before.
     */
    <AvatarStack alignRight size={size}>
      {faces.map(face => (
        <PrincipalHoverCard
          // A key that does not flip as the room's awareness churns: the same
          // person arrives now under their uid, now under a client id, and a
          // key that followed that would unmount the hover card mid-open and
          // leak its overlay. Their identity, not their arrival, names them.
          key={face.uid || face.handle || face.name.trim().toLowerCase()}
          kind="personal"
          uid={face.uid}
          handle={face.handle}
          displayName={face.name}
          name={face.name}
          avatarUrl={face.avatarUrl}
          avatarIcon={face.avatarIcon}
          onNavigate={onNavigate}
        >
          <PrincipalAvatar
            kind="personal"
            size={size}
            alt={face.name}
            avatarUrl={face.avatarUrl}
            avatarIcon={face.avatarIcon}
            square={false}
          />
        </PrincipalHoverCard>
      ))}
    </AvatarStack>
  );
}

export default LiveEditorCollaborators;
