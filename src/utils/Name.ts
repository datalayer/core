/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const asDisplayName = (givenName: string, familyName: string) => {
  return givenName
    ? familyName
      ? givenName + ' ' + familyName
      : givenName
    : (familyName ?? '');
};

export const nameAsInitials = (name: string) => {
  return name
    .replace(/\s+/, ' ')
    .split(' ')
    .slice(0, 2)
    .map(v => v && v[0].toUpperCase())
    .join('');
};

export const namesAsInitials = (firstName: string, lastName: string) => {
  return ((firstName || ' ').charAt(0) + (lastName || ' ').charAt(0))
    .toLocaleUpperCase()
    .trim();
};

/**
 * Convert first and last names to a friendly name.
 */
export const toFriendlyName = (firstName?: string, lastName?: string) => {
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return lastName;
  }
  return '';
};
