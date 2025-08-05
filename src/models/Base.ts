/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IUser } from '../models';

/**
 * Base response content for REST calls.
 */
export interface IRESTBaseResponse {
  success: boolean;
  message?: string;
}

export type IIAMResponseType = {
  success: boolean;
  user: IUser;
  token?: string;
  provided_token?: string,
  provided_token_issuer?: string,
  is_provided_token_external?: boolean,
}
