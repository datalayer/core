/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * creates name of file.
 *
 * @param {string} extension
 * @param {string[]} names parts of file name
 */
export const createFileName = (extension = '', ...names) => {
  if (!extension) {
    return '';
  }
  return `${names.join('')}.${extension}`;
};
