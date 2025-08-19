/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ReactPortal } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  IAnyOrganization,
  IAnySpace,
  IAnyTeam,
  ISpaceItem,
} from '../../models';

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

type BannerDisplay = {
  message: string;
  variant: BannerDisplayVariant;
  timestamp?: Date;
};

type PortalDisplay = {
  portal: ReactPortal;
  pinned: boolean;
};

export type ScreenshotDisplay = {
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
  screenshot?: ScreenshotDisplay;
  space?: IAnySpace;
  team?: IAnyTeam;
};

export type LayoutState = ILayoutState & {
  hideBackdrop: () => void;
  hideScreenshot: () => void;
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
  setScreenCapture: (screenCapture?: string) => void;
  showBackdrop: (message?: string) => void;
  showScreenshot: (message?: string) => void;
  triggerItemsRefresh: () => void;
  updateLayoutOrganization: (organization?: Partial<IAnyOrganization>) => void;
  updateLayoutSpace: (space?: Partial<IAnySpace>) => void;
  updateLayoutTeam: (team?: Partial<IAnyTeam>) => void;
};

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
  space: undefined,
  team: undefined,
  hideBackdrop: () =>
    set((state: LayoutState) => ({
      backdrop: { open: false, message: undefined },
    })),
  hideScreenshot: () =>
    set((state: LayoutState) => ({
      screenshot: { open: false, message: undefined },
    })),
  setBootstrapped: (bootstrapped: boolean) =>
    set((state: LayoutState) => ({ bootstrapped })),
  showBackdrop: (message?: string) =>
    set((state: LayoutState) => ({ backdrop: { open: true, message } })),
  showScreenshot: (message?: string) =>
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
      return {
        space: space
          ? {
              ...state.space,
              ...(space as IAnySpace),
            }
          : undefined,
      };
    }),
  setItem: (item?: ISpaceItem) => set((state: LayoutState) => ({ item })),
  triggerItemsRefresh: () =>
    set((state: LayoutState) => ({
      itemsRefreshCount: state.itemsRefreshCount + 1,
    })),
  setScreenCapture: (screenCapture?: string) =>
    set((state: LayoutState) => ({ screenCapture })),
  reset: () => set((state: LayoutState) => ({ bootstrapped: false })),
}));

export function useLayoutStore(): LayoutState;
export function useLayoutStore<T>(selector: (state: LayoutState) => T): T;
export function useLayoutStore<T>(selector?: (state: LayoutState) => T) {
  return useStore(layoutStore, selector!);
}

export default useLayoutStore;
