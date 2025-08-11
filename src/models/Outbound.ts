/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export class Outbound implements IOutbound {
  id: string;
  subType: string;
  name: string;
  description: string;
  tags: Array<string>;
  status: string;
  emailSubject: string;
  emailContent: string;
  senderUid: string;
  senderDisplayName: string;
  recipients: Array<string>;
  creationDate?: Date;
  lastUpdateDate?: Date;
  launchedDate?: Date;

  constructor(u: any) {
    this.id = u.uid;
    this.subType = u.subType;
    this.name = u.name;
    this.description = u.description;
    this.tags = u.tags ?? [];
    this.status = u.status;
    this.emailSubject = u.emailSubject;
    this.emailContent = u.emailContent;
    this.senderUid = u.senderUid;
    this.senderDisplayName = u.senderDisplayName;
    this.recipients = u.recipients;
    this.creationDate = new Date(u.creationDate);
    this.lastUpdateDate = new Date(u.lastUpdateDate);
    this.launchedDate = u.launchedDate ? new Date(u.launchedDate) : undefined;
  }

}

/**
 * Convert the raw user object to {@link IOutbound}.
 *
 * @param u Raw user object from DB
 * @returns Outbound
 */
export function asOutbound(u: any): IOutbound {
  return new Outbound(u);
}

export type IOutbound = {
  id: string;
  subType: string;
  name: string;
  description: string;
  tags: Array<string>;
  status: string;
  emailSubject: string;
  emailContent: string;
  senderUid: string;
  senderDisplayName: string;
  recipients: Array<string>;
  creationDate?: Date;
  lastUpdateDate?: Date;
  launchedDate?: Date;
}

export default IOutbound;
