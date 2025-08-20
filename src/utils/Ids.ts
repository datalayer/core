/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { v4 as uuid_v4 } from 'uuid';
import { ulid } from 'ulid';

export const newUuid = () => {
  return uuid_v4();
};

export const newUlid = () => {
  return ulid();
};
