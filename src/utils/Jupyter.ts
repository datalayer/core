/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { PageConfig } from '@jupyterlab/coreutils';

let _insideJupyterLab: boolean | null = null;

export function isInsideJupyterLab(): boolean {
  if (_insideJupyterLab === null) {
    _insideJupyterLab = PageConfig.getOption('appName') === 'JupyterLab';
  }
  return _insideJupyterLab;
}
