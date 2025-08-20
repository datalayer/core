/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IUser } from './User';
import { IContact } from './Contact';
import { asDisplayName, namesAsInitials } from '../utils';

export const asInvite = (i: any): IInvite => {
  const to: Partial<IContact> = {
    id: i.to_contact_uid,
    email: i.to_email_s,
    firstName: i.to_first_name_t,
    lastName: i.to_last_name_t,
    initials: namesAsInitials(i.to_first_name_t, i.to_last_name_t),
    displayName: asDisplayName(i.to_first_name_t, i.to_last_name_t),
  };
  return {
    id: '',
    token: i.token_s,
    to,
    message: i.message_t,
    sentDate: new Date(i.sent_ts_dt),
    joinDate: i.join_ts_dt ? new Date(i.join_ts_dt) : undefined,
    brand: i.brand_s ?? 'datalayer',
  };
};

export type IInvite = {
  id: string;
  token?: string;
  from?: IUser;
  to: Partial<IContact>;
  sentDate: Date;
  joinDate?: Date;
  message: string;
  brand: string;
};

export default IInvite;
