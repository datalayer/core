/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export class Inbound implements IInbound {
  id: string;
  subType: string;
  handle: string;
  payloadJson: string;
  creationDate?: Date;
  lastUpdateDate?: Date;

  constructor(u: any) {
    this.id = u.uid;
    this.subType = u.subType;
    this.handle = u.handle;
    this.payloadJson = u.payloadJson;
    this.creationDate = new Date(u.creationDate);
    this.lastUpdateDate = new Date(u.lastUpdateDate);
  }

}

/**
 * Convert the raw user object to {@link IInbound}.
 *
 * @param u Raw user object from DB
 * @returns Inbound
 */
export function asInbound(u: any): IInbound {
  return new Inbound(u);
}

export type IInbound = {
  id: string;
  subType: string;
  handle: string;
  payloadJson: string;
  creationDate?: Date;
  lastUpdateDate?: Date;
}

export default IInbound;
