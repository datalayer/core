/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { SpaceMember } from "./SpaceMember";
import { ISpaceItem } from "./SpaceItem";
import { ICourse as ICourse } from "./Course";
import { IOrganization } from "./Organization";
import { asUser, IUser } from "./User";
import { asArray } from "../utils";
import { newUserMock } from './../mocks/models'

/**
 * Convert the raw space object to {@link ISpace}.
 *
 * @param user Raw space object from DB
 * @returns Space
 */
export const asSpace = (raw_space: any): ISpace => {
  const owner = newUserMock();
  let members = new Array<SpaceMember>();
  if (raw_space.members) {
    members = asArray(raw_space.members).map(m => {
      const member: SpaceMember = asUser(m);
      return member;
    })
  }
  const space: ISpace = {
    id: raw_space.uid,
    handle: raw_space.handle_s,
    type: 'space',
    variant: raw_space.variant_s,
    name: raw_space.name_t,
    description: raw_space.description_t,
    public: raw_space.public_b,
    members,
    creationDate: new Date(raw_space.creation_ts_dt),
    owner,
    organization: {
      handle: raw_space.handle_s,
    }
  }
  return space;
}

export type ISpaceVariant =
  | 'default'
  | 'course'
  ;

export type IAnySpace = ISpace | ICourse;

export type IBaseSpace = {
  id: string;
  handle: string;
  type: string;
  variant: ISpaceVariant;
  name: string;
  description: string;
  creationDate: Date;
  public: boolean;
  owner: IUser;
  organization?: Partial<IOrganization>;
  members?: SpaceMember[];
};

export type ISpace = IBaseSpace & {
  type: 'space';
  variant: 'default';
  items?: Array<ISpaceItem>;
  itemIds?: Array<string>;
};

export default ISpace;
