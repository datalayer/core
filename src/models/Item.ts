/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { ISpaceItem } from "./SpaceItem";
import { IUser } from "./User";
import { IAnyOrganization } from "./Organization";
import { IAnySpace }  from "./Space";
import { IItemType }  from "./ItemType";

export type IAnyItem = ISpaceItem;

export type IItem = {
  id: string;
  type: IItemType;
  name: string;
  description: string;
  public: boolean;
  creationDate: Date;
  lastUpdateDate?: Date;
  lastPublicationDate?: Date;
  owner: IUser;
  space: Partial<IAnySpace>;
  organization: Partial<IAnyOrganization>;
};

export default IItem;
