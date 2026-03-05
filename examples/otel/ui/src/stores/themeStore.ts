/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OTEL example theme store – delegates to the reusable
 * `createThemeStore` from primer-addons with an app-specific
 * localStorage key.
 */

import { createThemeStore } from '@datalayer/primer-addons/lib/theme/useThemeStore';

export const useOtelThemeStore = createThemeStore('otel-example-theme', {
  colorMode: 'dark',
  theme: 'matrix',
});
