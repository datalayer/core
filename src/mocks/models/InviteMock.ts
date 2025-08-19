/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  uniqueNamesGenerator,
  names,
  colors,
  adjectives,
  animals,
} from 'unique-names-generator';
import { IInvite } from '../../models/Invite';
import { newUlid } from '../../utils';
import { newUserMock } from './UserMock';

export const newInviteMock = (message: string) => {
  const invite: IInvite = {
    id: newUlid(),
    from: newUserMock(
      uniqueNamesGenerator({ dictionaries: [names] }),
      uniqueNamesGenerator({ dictionaries: [names] }),
    ),
    to: {} as any, // TODO fix this
    sentDate: new Date(),
    message,
    brand: 'datalayer',
  };
  return invite;
};

export const INVITE_1_MOCK = newInviteMock(
  'A ' +
    uniqueNamesGenerator({
      dictionaries: [colors, adjectives, animals],
      separator: ' ',
    }) +
    '.',
);
export const INVITE_2_MOCK = newInviteMock(
  'A ' +
    uniqueNamesGenerator({
      dictionaries: [colors, adjectives, animals],
      separator: ' ',
    }) +
    '.',
);
export const INVITE_3_MOCK = newInviteMock(
  'A ' +
    uniqueNamesGenerator({
      dictionaries: [colors, adjectives, animals],
      separator: ' ',
    }) +
    '.',
);

export const INVITES_MOCK = [INVITE_1_MOCK, INVITE_2_MOCK, INVITE_3_MOCK];
