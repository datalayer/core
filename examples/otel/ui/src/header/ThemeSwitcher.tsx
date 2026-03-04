/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * ThemeSwitcher – Colored theme circles + color-mode segmented control.
 * Uses the reusable `ThemeSwitcher` from primer-addons, wired to
 * the app-specific `useOtelThemeStore`.
 */

import React from 'react';
import { ThemeSwitcher as PrimerThemeSwitcher } from '@datalayer/primer-addons/lib/theme/ThemeSwitcher';
import { useOtelThemeStore } from '../stores/themeStore';

export const ThemeSwitcher: React.FC = () => (
  <PrimerThemeSwitcher useStore={useOtelThemeStore} />
);
