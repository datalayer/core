/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export type IRole = {
  id: string;
  handle: string;
  displayName: string;
  description: string;
  permissions: Array<any>;
  icon: React.ElementType;
}

export default IRole;
