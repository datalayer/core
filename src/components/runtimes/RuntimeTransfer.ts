/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { type IRuntimeOptions } from '../../api';

export interface RuntimeTransfer {
  /**
   * Selected Kernel.
   */
  kernel: Partial<Omit<IRuntimeOptions, 'kernelType'> & { id: string }> | null;
  /**
   * List of selected variables
   *
   * It may differ with the serialized variables if
   * some serialization failed.
   */
  selectedVariables: string[];
}
