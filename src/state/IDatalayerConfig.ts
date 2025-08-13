/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

export type IDatalayerConfig = {
  /**
   * Datalayer RUN URL.
   */
  runUrl: string;
  /**
   * Datalayer Token.
   */
  token: string;
  /**
   * Credits.
   */
  credits: number;
  /**
   * CPU Environment.
   */
  cpuEnvironment: string;
  /**
   * GPU Environment.
   */
  gpuEnvironment: string;
};