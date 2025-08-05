/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import type { User } from '@jupyterlab/services';

export const newJupyterLabUserMock = (name: string) => {
    const user: User.IUser = {
      identity: {
        username: name,
        name: name,
        display_name: name,
        initials: name,
        color: "yellow",
      },
      permissions: {
      }
    };
  return user;
}
