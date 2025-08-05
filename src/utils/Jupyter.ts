/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { PageConfig } from '@jupyterlab/coreutils';

let _insideJupyterLab: boolean | null = null;

export function isInsideJupyterLab(): boolean {
  if (_insideJupyterLab === null) {
    _insideJupyterLab = PageConfig.getOption('appName') === 'JupyterLab';
  }
  return _insideJupyterLab;
}
