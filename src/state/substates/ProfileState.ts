/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * ProfileState — the one place the authenticated user's profile lives.
 *
 * The avatar and the banner used to be read from whatever carried them at
 * each call site — the IAM user, a whoami response, a form snapshot — and
 * the surfaces drifted: a banner updated on the profile page did not reach
 * the user menu until the page reloaded. Every surface showing the profile
 * (user menu, sidebars, profile views) reads this store instead, and every
 * flow that learns something about the profile (login, `GET /me`, a profile
 * update) writes it here.
 *
 * The store is fed automatically by {@link IAMState} on login, profile
 * update and logout, and by the `useMe` query with the full profile — the
 * consumers only ever read.
 *
 * @module state/substates/ProfileState
 */

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { IUser } from '../../models';

/** The profile of the authenticated user, as the surfaces show it. */
export type IProfile = {
  id?: string;
  uid?: string;
  handle?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  initials?: string;
  avatarUrl?: string;
  avatarIcon?: string;
  banner?: string;
  origin?: string;
  roles?: string[];
};

export type ProfileState = {
  profile?: IProfile;
  /** Replace the profile wholesale. */
  setProfile: (profile?: IProfile) => void;
  /** Merge what a flow just learned into the profile. */
  updateProfile: (partial: Partial<IProfile>) => void;
  /** The IAM user as the profile — login and refresh feed through this. */
  setProfileFromUser: (user?: IUser) => void;
  /** Logout. */
  clearProfile: () => void;
};

const userToProfile = (user?: IUser): IProfile | undefined =>
  user
    ? {
        id: user.id,
        uid: user.uid,
        handle: user.handle,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        initials: user.initials,
        avatarUrl: user.avatarUrl,
        avatarIcon: (user as any).avatarIcon,
        banner: (user as any).banner,
        origin: user.origin,
        roles: user.roles,
      }
    : undefined;

export const profileStore = createStore<ProfileState>(set => ({
  profile: undefined,
  setProfile: profile => set({ profile }),
  updateProfile: partial =>
    set(state => ({ profile: { ...state.profile, ...partial } })),
  setProfileFromUser: user =>
    set(state => {
      const profile = userToProfile(user);
      if (!profile) {
        return state;
      }
      // A login refresh may know less than a profile update that already
      // landed (the anonymous whoami has no banner): merge, newest wins,
      // but never erase a field with undefined.
      const merged: IProfile = { ...state.profile };
      for (const [key, value] of Object.entries(profile)) {
        if (value !== undefined) {
          (merged as any)[key] = value;
        }
      }
      return { profile: merged };
    }),
  clearProfile: () => set({ profile: undefined }),
}));

export function useProfileStore(): ProfileState;
export function useProfileStore<T>(selector: (state: ProfileState) => T): T;
export function useProfileStore<T>(selector?: (state: ProfileState) => T) {
  return useStore(profileStore, selector!);
}

/** The profile, for surfaces that show it. */
export const useProfile = (): IProfile | undefined =>
  useProfileStore(state => state.profile);

export default useProfileStore;
