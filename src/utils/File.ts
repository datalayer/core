/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

/**
 * creates name of file.
 * 
 * @param {string} extension
 * @param {string[]} parts of file name
 */
export const createFileName = (extension = '', ...names) => {
  if (!extension) {
    return '';
  }
  return `${names.join('')}.${extension}`;
}

