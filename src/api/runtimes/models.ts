/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Kernel } from '@jupyterlab/services';
import { IRuntimePod } from "../../models";

/**
 * Runtime location.
 */
export type RuntimeLocation =
| 'browser'
| 'local'
| string
;

/**
 * Runtime model.
 */
export interface IRuntimeModel extends IRuntimePod, Kernel.IModel {}

/**
 * Error thrown when a remote machine has been created
 * but no kernel can be reached within it.
 */
export class RuntimeUnreachable extends Error {
  name = 'RuntimeUnreachable';
}

/**
 * Runtime description.
 */
export interface IRuntimeDesc {
  /**
   * Runtime ID.
   */
  id?: string;
  /**
   * Runtime Kernel ID.
   */
  kernelId?: string;
  /**
   * Runtime name.
   */
  name: string;
  /**
   * Runtime language.
   */
  language: string;
  /**
   * Runtime location.
   */
  location: RuntimeLocation;
  /**
   * Runtime display name.
   */
  displayName?: string;
  /**
   * Runtime parameters.
   */
  params?: Record<string, any>;
  /**
   * Runtime credits burning rate.
   */
  burningRate?: number;
  /**
   * Runtime Pod name (if applicable).
   */
  podName?: string;
}
