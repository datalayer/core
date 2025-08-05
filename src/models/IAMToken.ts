/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const asToken = (s: any): IIAMToken => {
  return {
    id: s.uid,
    variant: s.variant_s,
    name: s.name_s,
    expirationDate: new Date(s.expiration_ts_dt),
    description: s.description_t,
    value: s.value_s,
  }
}

export type IIAMTokenVariant =
  'user_token'
  ;

export type IIAMToken = {
  id: string;
  variant: IIAMTokenVariant;
  name: string;
  description: string;
  value: string;
  expirationDate: Date;
};

export default IIAMToken;
