/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { asDisplayName, namesAsInitials } from '../utils';
import { IInvite } from './Invite';
import { asIAMProviderLinked, IIAMProviderLinked } from './IAMProviderLinked';
import {
  BOOTSTRAP_USER_ONBOARDING,
  IUserOnboardingModel,
} from './UserOnboardingModel';
import { IUserSettingsModel, UserSettingsModel } from './UserSettingsModel';
import { asUserEvent, IUserEvent } from './UserEvent';

export const ANONYMOUS_USER = undefined;

export const ANONYMOUS_USER_TOKEN = undefined;

export const ANONYMOUS_USER_EXTERNAL_TOKEN = undefined;

/**
 * Predefined colors for users
 */
const USER_COLORS = [
  'var(--jp-collaborator-color1)',
  'var(--jp-collaborator-color2)',
  'var(--jp-collaborator-color3)',
  'var(--jp-collaborator-color4)',
  'var(--jp-collaborator-color5)',
  'var(--jp-collaborator-color6)',
  'var(--jp-collaborator-color7)',
];

/**
 * Get a random color from the list of colors.
 */
export const getUserRandomColor = (): string =>
  USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

export class User implements IUser {
  id: string;
  handle: string;
  email: string;
  firstName: string;
  lastName: string;
  initials: string;
  displayName: string;
  joinDate?: Date;
  roles: string[];
  credits?: number;
  creditsCustomerId?: string;
  avatarUrl?: string;
  origin?: string;
  invites?: Array<IInvite>;
  iamProviders: Array<IIAMProviderLinked>;
  settings: IUserSettingsModel;
  unsubscribedFromOutbounds: boolean;
  mfaUrl?: string;
  onboarding: IUserOnboardingModel;
  linkedContactId?: string;
  events: Array<IUserEvent>;

  constructor(u: any) {
    this.id = u.uid;
    this.handle = u.handle_s;
    this.email = u.email_s;
    this.firstName = u.first_name_t;
    this.lastName = u.last_name_t;
    this.initials = namesAsInitials(u.first_name_t, u.last_name_t);
    const displayName = asDisplayName(u.first_name_t, u.last_name_t);
    this.displayName = displayName === '' ? u.handle_s : displayName;
    this.avatarUrl = u.avatar_url_s;
    this.origin = u.origin_s;
    this.joinDate = u.join_ts_dt ? new Date(u.join_ts_dt) : undefined;
    this.credits = u.credits_i ? Number(u.credits_i) : 0;
    this.creditsCustomerId = u.credits_customer_uid;
    this.roles = u.roles_ss ?? [];
    let iamProviders = [];
    try {
      iamProviders = (u.iam_providers ?? []).map(iamProvider =>
        asIAMProviderLinked(iamProvider),
      );
    } catch (e) {
      // no-op for backwards compatibility.
    }
    this.iamProviders = iamProviders;
    this.settings = new UserSettingsModel(u.settings ?? {});
    this.unsubscribedFromOutbounds = u.unsubscribed_from_outbounds_b ?? false;
    this.mfaUrl = u.mfa_url_s;
    this.onboarding = u.onboarding_s
      ? JSON.parse(u.onboarding_s)
      : BOOTSTRAP_USER_ONBOARDING;
    this.linkedContactId = u.linked_contact_uid;
    let events = u.events ?? [];
    if (!Array.isArray(events)) {
      events = [events];
    }
    this.events = events.map(event => asUserEvent(event));
    this.events.sort((x, y) => (x.eventDate < y.eventDate ? 1 : -1));
  }

  public setRoles(roles: string[]) {
    this.roles = roles;
  }
}

/**
 * Convert the raw user object to {@link IUser}.
 *
 * @param u Raw user object from DB
 * @returns IUser
 */
export function asUser(u: any): IUser {
  return new User(u);
}

export type IBaseUser = {
  email: string;
  firstName: string;
  lastName: string;
  initials: string;
  displayName: string;
  joinDate?: Date;
  roles: string[];
  setRoles: (roles: string[]) => void;
};

export type IUser = IBaseUser & {
  id: string;
  handle: string;
  credits?: number;
  creditsCustomerId?: string;
  avatarUrl?: string;
  origin?: string;
  invites?: Array<IInvite>;
  iamProviders: Array<IIAMProviderLinked>;
  settings: IUserSettingsModel;
  unsubscribedFromOutbounds: boolean;
  mfaUrl?: string;
  onboarding: IUserOnboardingModel;
  linkedContactId?: string;
  events: Array<IUserEvent>;
};

export default IUser;
