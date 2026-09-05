/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ReactPortal } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { IAnyOrganization, IAnyTeam } from '../../models';

/**
 * Structural placeholder for a space in the layout state. The concrete space
 * models live in the runtime/content package (`@datalayer/agent-runtimes`);
 * the core layout store keeps them loosely typed to avoid depending on the
 * content models.
 */
type IAnySpace = Record<string, any>;
/**
 * Structural placeholder for a space item in the layout state. See IAnySpace.
 */
type ISpaceItem = Record<string, any>;

export type BannerDisplayVariant = 'danger' | 'info' | 'success' | 'warning';

export type LeftSidebarVariant =
  | 'codefeed'
  | 'course'
  | 'empty'
  | 'guess-account'
  | 'guess-space'
  | 'guess-spaces'
  | 'organization'
  | 'organization-space'
  | 'organization-spaces'
  | 'organizations'
  | 'public'
  | 'unchanged'
  | 'user'
  | 'user-space'
  | 'user-spaces';

export type BackdropDisplay = {
  open: boolean;
  message?: string | void;
};

export type BannerDisplay = {
  message: string;
  variant: BannerDisplayVariant;
  timestamp?: Date;
};

export type PortalDisplay = {
  portal: ReactPortal;
  pinned: boolean;
};

export type ScreencaptureDisplay = {
  open: boolean;
  message?: string | void;
};

export type ILayoutState = {
  backdrop?: BackdropDisplay;
  banner?: BannerDisplay;
  bootstrapped: boolean;
  item?: ISpaceItem;
  itemsRefreshCount: number;
  leftPortal?: PortalDisplay;
  leftSidebarVariant: LeftSidebarVariant;
  organization?: IAnyOrganization;
  rightPortal?: PortalDisplay;
  screenCapture?: string;
  screenshot?: ScreencaptureDisplay;
  space?: IAnySpace;
  team?: IAnyTeam;
};

export type LayoutState = ILayoutState & {
  hideBackdrop: () => void;
  hideScreencapture: () => void;
  reset: () => void;
  resetForcedLeftPortal: () => void;
  resetForcedRightPortal: () => void;
  resetLeftPortal: () => void;
  resetRightPortal: () => void;
  setBanner: (bannerDisplay: BannerDisplay) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
  setItem: (item?: ISpaceItem) => void;
  setLeftPortal: (leftPortal: PortalDisplay) => void;
  setLeftSidebarVariant: (leftSidebarVariant: LeftSidebarVariant) => void;
  setRightPortal: (rightPortal: PortalDisplay) => void;
  setScreencapture: (screenCapture?: string) => void;
  showBackdrop: (message?: string) => void;
  showScreencapture: (message?: string) => void;
  triggerItemsRefresh: () => void;
  updateLayoutOrganization: (organization?: Partial<IAnyOrganization>) => void;
  updateLayoutSpace: (space?: Partial<IAnySpace>) => void;
  updateLayoutTeam: (team?: Partial<IAnyTeam>) => void;
};


/**
 * Name of the cookie holding the space last selected by the user.
 *
 * The selection has to survive a reload, as the whole user interface is scoped
 * by it; it lives in a cookie next to the principal context written by
 * `usePrincipalStore`.
 */
const SPACE_CONTEXT_COOKIE = 'datalayer-space-context';
const SPACE_CONTEXT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The identity of a space, all a reload needs to restore the selection. */
type SpaceContextCookie = {
  id?: string;
  handle?: string;
  name?: string;
};

const readSpaceContextCookie = (): SpaceContextCookie | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const escaped = SPACE_CONTEXT_COOKIE.replace(
    /[-[\]{}()*+?.,\\^$|#\s]/g,
    '\\$&',
  );
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`),
  );
  if (!match?.[1]) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') {
      return undefined;
    }
    return {
      id: parsed.id,
      handle: typeof parsed.handle === 'string' ? parsed.handle : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
    };
  } catch {
    return undefined;
  }
};

const writeSpaceContextCookie = (space?: Partial<IAnySpace>): void => {
  if (typeof document === 'undefined') {
    return;
  }
  if (!space?.id) {
    document.cookie =
      `${SPACE_CONTEXT_COOKIE}=;` + ' path=/; max-age=0; SameSite=Lax';
    return;
  }
  const value = encodeURIComponent(
    JSON.stringify({
      id: space.id,
      handle: space.handle,
      name: space.name,
    }),
  );
  document.cookie =
    `${SPACE_CONTEXT_COOKIE}=${value};` +
    ` path=/; max-age=${SPACE_CONTEXT_COOKIE_MAX_AGE}; SameSite=Lax`;
};

const initialSpaceContext = readSpaceContextCookie();

export const layoutStore = createStore<LayoutState>((set, get) => ({
  backdrop: undefined,
  banner: undefined,
  bootstrapped: false,
  item: undefined,
  itemsRefreshCount: 0,
  leftPortal: undefined,
  leftSidebarVariant: 'empty',
  organization: undefined,
  rightPortal: undefined,
  screenCapture: undefined,
  // Restored from the cookie; the full space is hydrated once loaded.
  space: initialSpaceContext,
  team: undefined,
  hideBackdrop: () =>
    set((state: LayoutState) => ({
      backdrop: { open: false, message: undefined },
    })),
  hideScreencapture: () =>
    set((state: LayoutState) => ({
      screenshot: { open: false, message: undefined },
    })),
  setBootstrapped: (bootstrapped: boolean) =>
    set((state: LayoutState) => ({ bootstrapped })),
  showBackdrop: (message?: string) =>
    set((state: LayoutState) => ({ backdrop: { open: true, message } })),
  showScreencapture: (message?: string) =>
    set((state: LayoutState) => ({ screenshot: { open: true, message } })),
  setBanner: (bannerDisplay: BannerDisplay) =>
    set((state: LayoutState) => ({
      banner: {
        timestamp: new Date(),
        message: bannerDisplay.message,
        variant: bannerDisplay.variant,
      },
    })),
  setLeftPortal: (leftPortal: PortalDisplay) =>
    set((state: LayoutState) => ({ leftPortal })),
  setRightPortal: (rightPortal: PortalDisplay) =>
    set((state: LayoutState) => ({ rightPortal })),
  resetLeftPortal: () =>
    set((state: LayoutState) => ({
      leftPortal: state.leftPortal?.pinned ? state.leftPortal : undefined,
    })),
  resetRightPortal: () =>
    set((state: LayoutState) => ({
      rightPortal: state.rightPortal?.pinned ? state.rightPortal : undefined,
    })),
  resetForcedLeftPortal: () =>
    set((state: LayoutState) => ({ leftPortal: undefined })),
  resetForcedRightPortal: () =>
    set((state: LayoutState) => ({ rightPortal: undefined })),
  setLeftSidebarVariant: (leftSidebarVariant: LeftSidebarVariant) =>
    set((state: LayoutState) => ({ leftSidebarVariant })),
  updateLayoutOrganization: (organization?: Partial<IAnyOrganization>) =>
    set((state: LayoutState) => {
      return {
        organization: organization
          ? {
              ...state.organization,
              ...(organization as IAnyOrganization),
            }
          : undefined,
      };
    }),
  updateLayoutTeam: (team?: Partial<IAnyTeam>) =>
    set((state: LayoutState) => {
      return {
        team: team
          ? {
              ...state.team,
              ...(team as IAnyTeam),
            }
          : undefined,
      };
    }),
  updateLayoutSpace: (space?: Partial<IAnySpace>) =>
    set((state: LayoutState) => {
      const next = space
        ? {
            ...state.space,
            ...(space as IAnySpace),
          }
        : undefined;
      writeSpaceContextCookie(next);
      return {
        space: next,
      };
    }),
  setItem: (item?: ISpaceItem) => set((state: LayoutState) => ({ item })),
  triggerItemsRefresh: () =>
    set((state: LayoutState) => ({
      itemsRefreshCount: state.itemsRefreshCount + 1,
    })),
  setScreencapture: (screenCapture?: string) =>
    set((state: LayoutState) => ({ screenCapture })),
  reset: () => set((state: LayoutState) => ({ bootstrapped: false })),
}));

export function useLayoutStore(): LayoutState;
export function useLayoutStore<T>(selector: (state: LayoutState) => T): T;
export function useLayoutStore<T>(selector?: (state: LayoutState) => T) {
  return useStore(layoutStore, selector!);
}

export default useLayoutStore;
