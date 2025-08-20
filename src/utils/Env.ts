/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const isDevDeployment = () => {
  return (
    location.hostname.startsWith('dev') ||
    location.hostname.startsWith('localhost')
  );
};
