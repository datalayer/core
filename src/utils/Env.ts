/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const isDevDeployment = () => {
  return location.hostname.startsWith('dev') || location.hostname.startsWith('localhost');
}
