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

export type LiveCollaborator = {
  /** Stable identity — a user uid, or the awareness client id. */
  id: string;
  name: string;
  avatarUrl?: string;
  avatarIcon?: string;
  /** Cursor color of the presence, worn by the initials disc. */
  color?: string;
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
  const name: string =
    user.display_name || user.displayName || user.name || user.username || '';
  if (!name) {
    return undefined;
  }
  return {
    id: String(user.uid ?? user.id ?? user.username ?? clientId),
    name,
    avatarUrl: user.avatar_url || user.avatarUrl || undefined,
    avatarIcon: user.avatar_icon_s || user.avatarIcon || undefined,
    color: user.color || undefined
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
};

export function LiveEditorCollaborators(
  props: LiveEditorCollaboratorsProps
): JSX.Element | null {
  const { awareness, collaborators = [], max = 5, size = 24 } = props;
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
    // Who is here leads; who merely belongs completes. Folded by id and
    // then by name: the same person often arrives twice — once under their
    // platform uid, once under the identity the room gave them.
    const merged = new Map<string, LiveCollaborator>();
    const byName = new Map<string, string>();
    for (const collaborator of [...present, ...collaborators]) {
      const nameKey = collaborator.name.trim().toLowerCase();
      const key = merged.has(collaborator.id)
        ? collaborator.id
        : (byName.get(nameKey) ?? collaborator.id);
      const known = merged.get(key);
      if (!known) {
        merged.set(key, collaborator);
        byName.set(nameKey, key);
      } else if (
        (!known.avatarIcon && collaborator.avatarIcon) ||
        (!known.avatarUrl && collaborator.avatarUrl)
      ) {
        merged.set(key, {
          ...known,
          avatarIcon: known.avatarIcon || collaborator.avatarIcon,
          avatarUrl: known.avatarUrl || collaborator.avatarUrl,
        });
      }
    }
    return Array.from(merged.values()).slice(0, max);
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
        <PrincipalAvatar
          key={face.id}
          kind="personal"
          size={size}
          alt={face.name}
          avatarUrl={face.avatarUrl}
          avatarIcon={face.avatarIcon}
          square={false}
        />
      ))}
    </AvatarStack>
  );
}

export default LiveEditorCollaborators;
