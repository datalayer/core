/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * ThemeSwitcher – Colored theme circles + color-mode segmented control.
 * Reads and writes to the shared `useOtelThemeStore`.
 */

import React from 'react';
import { Box, SegmentedControl } from '@primer/react';
import {
  SunIcon,
  MoonIcon,
  DeviceDesktopIcon,
} from '@primer/octicons-react';
import {
  themeConfigs,
  themeVariants,
  type ColorMode,
} from '@datalayer/primer-addons/lib/theme';
import { useOtelThemeStore } from '../stores/themeStore';

export const ThemeSwitcher: React.FC = () => {
  const { colorMode, theme: themeVariant } = useOtelThemeStore();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {/* Theme colored circles */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {themeVariants.map(variant => {
          const tcfg = themeConfigs[variant];
          const isSelected = themeVariant === variant;
          return (
            <Box
              as="button"
              key={variant}
              aria-label={tcfg.label}
              aria-pressed={isSelected}
              onClick={() =>
                useOtelThemeStore.getState().setTheme(variant, false)
              }
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: tcfg.brandColor,
                border: '2px solid',
                borderColor: isSelected ? 'accent.fg' : 'border.default',
                cursor: 'pointer',
                padding: 0,
                outline: 'none',
                transition: 'border-color 0.15s ease',
                boxShadow: isSelected
                  ? '0 0 0 2px var(--bgColor-accent-muted, rgba(9,105,218,0.3))'
                  : 'none',
                '&:hover': { borderColor: 'accent.fg' },
                '&:focus-visible': {
                  boxShadow:
                    '0 0 0 2px var(--bgColor-accent-muted, rgba(9,105,218,0.3))',
                },
              }}
            />
          );
        })}
      </Box>

      {/* Color mode segmented control */}
      <SegmentedControl
        aria-label="Color mode"
        size="small"
        onChange={(index: number) => {
          const modes: ColorMode[] = ['light', 'dark', 'auto'];
          useOtelThemeStore.getState().setColorMode(modes[index]);
        }}
      >
        <SegmentedControl.IconButton
          selected={colorMode === 'light'}
          icon={SunIcon}
          aria-label="Light"
        />
        <SegmentedControl.IconButton
          selected={colorMode === 'dark'}
          icon={MoonIcon}
          aria-label="Dark"
        />
        <SegmentedControl.IconButton
          selected={colorMode === 'auto'}
          icon={DeviceDesktopIcon}
          aria-label="Auto"
        />
      </SegmentedControl>
    </Box>
  );
};
