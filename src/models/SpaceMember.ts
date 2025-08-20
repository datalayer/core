/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Member } from './Member';
import { ISpace } from './Space';

export type SpaceMember = Member & {
  space?: ISpace;
};

export default SpaceMember;
