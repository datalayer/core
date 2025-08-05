/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { uniqueNamesGenerator, animals, names } from "unique-names-generator";
import { IUser } from "../../models/User";
import { newUlid, asDisplayName, namesAsInitials } from "../../utils";

export const newUserMock = (firstName?: string, lastName?: string) => {
  const mockFistName = firstName ?? uniqueNamesGenerator({dictionaries: [names]});
  const mockLastName = lastName ?? uniqueNamesGenerator({dictionaries: [names]});
  const user: IUser = {
    id: newUlid(),
    handle: uniqueNamesGenerator({dictionaries: [animals]}).toLowerCase(),
    email: mockFistName + "@datalayer.test",
    firstName: mockFistName,
    lastName: mockLastName,
    initials: namesAsInitials(mockFistName, mockLastName),
    displayName: asDisplayName(mockFistName, mockLastName),
    roles: [
      'mock_role',
    ],
    iamProviders: [],
    setRoles: (roles: string[]) =>  {},
    unsubscribedFromOutbounds: false,
    onboarding: {} as any,
    events: [],
    settings: {},
  };
  return user;
}
