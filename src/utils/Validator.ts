/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const isValidEmail = (value?: string) => {
  if (!value) {
    return false;
  }
  if (EMAIL_REGEX.test(value)) {
    return true;
  }
  return false;
};

/**
 * Verify if a string has a given length or not.
 */
export const validateLength = (value: string | undefined, minLength: number) => {
  if (!value) {
    return false;
  }
  if (value.length >= minLength) {
    return true;
  }
  return false;
};

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[[\]!"$%&/()=?@~`\\.';:+=^*#_-])[A-Za-z\d[\]!"$%&/()=?@~`\\.';:+=^*#_-]{8,64}$/;

/**
 * Check the password complexity
 * @param password Password to validate
 * @returns Whether the password various criteria
 */
export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}
