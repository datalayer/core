/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { v4 as uuid_v4 } from 'uuid';
import { ulid } from 'ulid'

export const newUuid = () => {
  return uuid_v4();
}

export const newUlid = () => {
  return ulid();
}
