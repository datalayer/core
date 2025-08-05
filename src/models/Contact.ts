/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { asContactIAMProvider, IContactIAMProvider } from "./ContactIAMProvider";
import { asContactEvent, IContactEvent } from './ContactEvent';
import { asDisplayName, namesAsInitials } from '../utils';

export class Contact implements IContact {
  id: string;
  handle: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  initials: string;
  displayName: string;
  text: string;
  jobTitle?: string;
  email?: string;
  emailPersonal?: string;
  countryCode?: string;
  affiliation?: string;
  affiliationUrl?: string;
  affiliationLinkedinUrl?: string;
  affiliationSecondary?: string;
  affiliationTertiary?: string;
  notes?: string;
  tags: string[];
  events: Array<IContactEvent> = new Array<IContactEvent>();
  iamProviders: Array<IContactIAMProvider> = new Array<IContactIAMProvider>();
  creationDate: Date;
  lastUpdateDate?: Date;
  emailEnrichJson: string;
  linkedinEnrichJson: string;
  unsubscribedFromOutbounds: boolean;
  linkedUserUid?: string;

  constructor(c: any) {
    this.id = c.uid;
    this.handle = c.handle;
    this.firstName = c.firstName ?? "";
    this.lastName = c.lastName ?? "";
    this.jobTitle = c.jobTitle ?? "";
    this.email = c.email ?? "";
    this.emailPersonal = c.emailPersonal ?? "";
    this.countryCode = c.countryCode ?? "";
    this.initials = namesAsInitials(this.firstName, this.lastName);
    const displayName = asDisplayName(this.firstName, this.lastName);
    this.displayName = displayName || '❓';
    this.text = this.displayName;
    this.avatarUrl = c.avatarUrl ?? "";
    this.affiliation = c.affiliation ?? "";
    this.affiliationUrl = c.affiliationUrl ?? "";
    this.affiliationLinkedinUrl = c.affiliationLinkedinUrl ?? "";
    this.affiliationSecondary = c.affiliationSecondary ?? "";
    this.affiliationTertiary = c.affiliationTertiary ?? "";
    this.notes = c.notes ?? "";
    this.tags = c.tags ?? [];
    let iamProviders = c.iamProviders ?? [];
    if (!Array.isArray(iamProviders)) {
      iamProviders = [iamProviders];
    }
    this.iamProviders = iamProviders.map(iamProvider => asContactIAMProvider(iamProvider));
    let events = c.events ?? [];
    if (!Array.isArray(events)) {
      events = [events];
    }
    this.events = events.map(event => asContactEvent(event)) as Array<IContactEvent>;
    this.events.sort((x, y) => (x.eventDate < y.eventDate ? 1 : -1));
    this.creationDate = new Date(c.creationDate);
    this.lastUpdateDate = new Date(c.lastUpdateDate);
    this.emailEnrichJson = c.emailEnrichJson ?? '{}';
    this.linkedinEnrichJson = c.linkedinEnrichJson ?? '{}';
    this.unsubscribedFromOutbounds = c.unsubscribedFromOutbounds ?? false;
    this.linkedUserUid = c.linkedUserUid ?? '';
  }

  public setTags(tags: string[]) {
    this.tags = tags;
  }

  public addEvent(event: IContactEvent) {
    this.events.push(event);
  }

}

/**
 * Convert the raw contact object to {@link IContact}.
 *
 * @param c Raw contact object
 * @returns Contact
 */
export function asContact(c: any): IContact {
  return new Contact(c);
}

export type IContact = {
  id: string;
  handle: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  initials: string;
  displayName: string;
  text: string;
  jobTitle?: string;
  email?: string;
  emailPersonal?: string;
  countryCode?: string;
  affiliation?: string;
  affiliationUrl?: string;
  affiliationLinkedinUrl?: string;
  affiliationSecondary?: string;
  affiliationTertiary?: string;
  notes?: string;
  tags: string[];
  setTags: (tags: string[]) => void;
  events: Array<IContactEvent>;
  addEvent: (event: IContactEvent) => void;
  iamProviders: Array<IContactIAMProvider>;
  creationDate: Date;
  lastUpdateDate?: Date;
  emailEnrichJson: string;
  linkedinEnrichJson: string;
  unsubscribedFromOutbounds: boolean;
  linkedUserUid?: string;
}

export default IContact;
