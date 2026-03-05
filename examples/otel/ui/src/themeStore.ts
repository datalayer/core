/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createThemeStore } from '@datalayer/primer-addons';

export const useThemeStore = createThemeStore('otel-example-theme', {
  colorMode: 'dark',
  theme: 'matrix',
});
