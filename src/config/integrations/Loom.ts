/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

const IS_LOCALHOST = location.hostname === 'localhost';

export const getLoomPublicAppId = () => {
  return IS_LOCALHOST
  ? LOOM_PUBLIC_APP_ID.LOCALHOST
  : LOOM_PUBLIC_APP_ID.DATALAYER_IO;
}

// It is safe to expose PUBLIC APP ID here.
// @see https://dev.loom.com/docs
const LOOM_PUBLIC_APP_ID = {
  LOCALHOST: "05754d5d-4778-4e6f-852a-a22fa0b5e87f",
  DATALAYER_IO: "4b431848-adf7-457e-a545-0b0c7d21602a" 
}
