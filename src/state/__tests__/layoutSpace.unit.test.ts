/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The layout holds one space and one organization: another one replaces it,
 * an update of the same one is merged onto it.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { layoutStore } from '../substates/LayoutState';

beforeEach(() => {
  layoutStore.getState().updateLayoutSpace(undefined);
  layoutStore.getState().updateLayoutOrganization(undefined);
});

describe('the layout space', () => {
  it('is replaced by a different space, nothing of the one left staying', () => {
    const { updateLayoutSpace } = layoutStore.getState();
    updateLayoutSpace({
      uid: 'org-main',
      handle: 'main',
      organization_handle_s: 'datalayer',
      team_uid: 't1',
    });
    updateLayoutSpace({ uid: 'personal-main', handle: 'main' });
    expect(layoutStore.getState().space).toEqual({
      uid: 'personal-main',
      handle: 'main',
    });
  });

  it('is told apart by id when there is no uid', () => {
    const { updateLayoutSpace } = layoutStore.getState();
    updateLayoutSpace({ id: 's1', variant: 'course' });
    updateLayoutSpace({ id: 's2' });
    expect(layoutStore.getState().space).toEqual({ id: 's2' });
  });

  it('merges an update of the same space', () => {
    const { updateLayoutSpace } = layoutStore.getState();
    updateLayoutSpace({ uid: 's1', handle: 'main', team_uid: 't1' });
    updateLayoutSpace({ uid: 's1', name: 'Main' });
    expect(layoutStore.getState().space).toEqual({
      uid: 's1',
      handle: 'main',
      team_uid: 't1',
      name: 'Main',
    });
  });

  it('merges an update that names no space', () => {
    const { updateLayoutSpace } = layoutStore.getState();
    updateLayoutSpace({ uid: 's1', handle: 'main' });
    updateLayoutSpace({ name: 'Main' });
    expect(layoutStore.getState().space).toEqual({
      uid: 's1',
      handle: 'main',
      name: 'Main',
    });
  });
});

describe('the layout organization', () => {
  it('is replaced by a different organization', () => {
    const { updateLayoutOrganization } = layoutStore.getState();
    updateLayoutOrganization({
      id: 'o1',
      handle: 'datalayer',
      name: 'Datalayer',
    } as any);
    updateLayoutOrganization({ id: 'o2', handle: 'acme' } as any);
    expect(layoutStore.getState().organization).toEqual({
      id: 'o2',
      handle: 'acme',
    });
  });

  it('merges an update of the same organization', () => {
    const { updateLayoutOrganization } = layoutStore.getState();
    updateLayoutOrganization({ id: 'o1', handle: 'datalayer' } as any);
    updateLayoutOrganization({ id: 'o1', name: 'Datalayer' } as any);
    expect(layoutStore.getState().organization).toEqual({
      id: 'o1',
      handle: 'datalayer',
      name: 'Datalayer',
    });
  });
});
