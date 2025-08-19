/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { IconButton } from '@primer/react';
import { SunIcon, MoonIcon } from '@primer/octicons-react';

export default function ThemeSelector() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getIcon = () => {
    return mounted && theme === 'dark' ? MoonIcon : SunIcon;
  };

  // Always render the same structure to avoid hydration mismatches
  return (
    <IconButton
      icon={getIcon()}
      onClick={toggleTheme}
      aria-label={`Toggle theme (current: ${mounted ? theme : 'light'})`}
      title={`Switch to ${mounted && theme === 'light' ? 'dark' : 'light'} mode`}
      disabled={!mounted}
    />
  );
}
