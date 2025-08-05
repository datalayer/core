/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const isDevDeployment = () => {
  return location.hostname.startsWith('dev') || location.hostname.startsWith('localhost');
}
