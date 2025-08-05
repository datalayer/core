/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const asSecret = (s: any): ISecret => {
  return {
    id: s.uid,
    variant: s.variant_s,
    name: s.name_s,
    description: s.description_t,
    value: s.value_s,
  }
}

export type ISecretVariant =
  | 'generic'
  | 'password'
  | 'key'
  | 'token'
  ;

export type ISecret = {
  id: string;
  variant: ISecretVariant;
  name: string;
  description: string;
  value: string;
};

export default ISecret;
