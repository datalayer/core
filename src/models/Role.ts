/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
