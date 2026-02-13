/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { theme as primerTheme } from '@primer/react';
import cloneDeep from 'lodash/cloneDeep.js';
import merge from 'lodash/merge.js';

/**
 * Datalayer Accessible Color System
 * Based on Datalayer's brand manual - WCAG AA/AAA compliant
 */
export const datalayerColors = {
  // Core Neutrals
  black: '#000000', // Primary text - AAA on white
  gray: '#59595C', // Secondary text - AA on white
  white: '#FFFFFF', // Background

  // Greens (Brand & Accessibility)
  greenBrand: '#16A085', // Brand accent, icons, dividers, headings
  greenAccent: '#1ABC9C', // Icons, charts, highlights on dark surfaces
  greenText: '#117A65', // Accessible green for text & buttons (AA+ on white)
  greenTint: '#E9F7F1', // Soft background for success / callouts
  greenBright: '#2ECC71', // Highlights and glow on dark backgrounds
  greenHover: '#0E6655', // Primary button hover
};

/**
 * Datalayer Theme for Primer React.
 *
 * Uses accessible color palette from Datalayer's brand manual.
 */
const datalayerThemeDefs = {
  colorSchemes: {
    light: {
      colors: {
        // Canvas colors
        canvas: {
          default: datalayerColors.white,
          // subtle: datalayerColors.greenTint,
        },
        // Foreground colors
        fg: {
          default: datalayerColors.black,
          muted: datalayerColors.gray,
          onEmphasis: datalayerColors.white,
        },
        // Accent colors (brand green)
        accent: {
          fg: datalayerColors.greenText,
          emphasis: datalayerColors.greenBrand,
          muted: datalayerColors.greenAccent,
          // subtle: datalayerColors.greenTint,
        },
        // Success colors (green)
        success: {
          fg: datalayerColors.greenText,
          emphasis: datalayerColors.greenBrand,
          muted: datalayerColors.greenAccent,
          // subtle: datalayerColors.greenTint,
        },
        // Button colors
        btn: {
          text: datalayerColors.black,
          bg: datalayerColors.white,
          border: datalayerColors.gray,
          hoverBg: datalayerColors.greenTint,
          hoverBorder: datalayerColors.gray,
          activeBg: datalayerColors.greenTint,
          activeBorder: datalayerColors.gray,
          selectedBg: datalayerColors.white,
          counterBg: datalayerColors.gray,
          primary: {
            text: datalayerColors.white,
            bg: datalayerColors.greenText,
            border: datalayerColors.greenText,
            hoverBg: datalayerColors.greenHover,
            hoverBorder: datalayerColors.greenHover,
            selectedBg: datalayerColors.greenHover,
            disabledText: 'rgba(255, 255, 255, 0.8)',
            disabledBg: '#94C9B9',
            disabledBorder: '#94C9B9',
            icon: datalayerColors.white,
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: datalayerColors.greenText,
            hoverText: datalayerColors.white,
            hoverBg: datalayerColors.greenText,
            hoverBorder: datalayerColors.greenText,
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: datalayerColors.white,
            selectedBg: datalayerColors.greenHover,
            selectedBorder: datalayerColors.greenHover,
            disabledText: datalayerColors.gray,
            disabledBg: datalayerColors.greenTint,
            disabledCounterBg: 'rgba(0, 0, 0, 0.05)',
            counterBg: 'rgba(0, 0, 0, 0.05)',
            counterFg: datalayerColors.greenText,
            hoverCounterFg: datalayerColors.white,
            disabledCounterFg: datalayerColors.gray,
          },
          danger: {
            text: '#d32f2f',
            hoverText: datalayerColors.white,
            hoverBg: '#d32f2f',
            hoverBorder: '#d32f2f',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: datalayerColors.white,
            selectedBg: '#b71c1c',
            selectedBorder: '#b71c1c',
            disabledText: 'rgba(211, 47, 47, 0.5)',
            disabledBg: datalayerColors.greenTint,
            disabledCounterBg: 'rgba(211, 47, 47, 0.05)',
            counterBg: 'rgba(211, 47, 47, 0.1)',
            counterFg: '#d32f2f',
            hoverCounterFg: datalayerColors.white,
            disabledCounterFg: 'rgba(211, 47, 47, 0.5)',
            icon: '#d32f2f',
          },
        },
      },
      shadows: {},
    },
    dark: {
      colors: {
        // Canvas colors
        canvas: {
          default: datalayerColors.black,
          subtle: '#0d1117',
        },
        // Foreground colors
        fg: {
          default: datalayerColors.white,
          muted: '#8b949e',
          onEmphasis: datalayerColors.white,
        },
        // Accent colors (bright greens for dark mode)
        accent: {
          fg: datalayerColors.greenAccent,
          emphasis: datalayerColors.greenBright,
          muted: datalayerColors.greenBrand,
          subtle: '#1f352d',
        },
        // Success colors
        success: {
          fg: datalayerColors.greenAccent,
          emphasis: datalayerColors.greenBright,
          muted: datalayerColors.greenBrand,
          subtle: '#1f352d',
        },
        // Button colors for dark mode
        btn: {
          text: '#c9d1d9',
          bg: '#21262d',
          border: 'rgba(240, 246, 252, 0.1)',
          hoverBg: '#30363d',
          hoverBorder: '#8b949e',
          activeBg: 'hsla(212, 12%, 18%, 1)',
          activeBorder: '#6e7681',
          selectedBg: '#161b22',
          counterBg: '#30363d',
          primary: {
            text: datalayerColors.white,
            bg: datalayerColors.greenAccent,
            border: 'rgba(240, 246, 252, 0.1)',
            hoverBg: datalayerColors.greenBright,
            hoverBorder: 'rgba(240, 246, 252, 0.1)',
            selectedBg: datalayerColors.greenBright,
            disabledText: 'rgba(255, 255, 255, 0.5)',
            disabledBg: 'rgba(22, 160, 133, 0.35)',
            disabledBorder: 'rgba(22, 160, 133, 0.2)',
            icon: datalayerColors.white,
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: datalayerColors.greenAccent,
            hoverText: datalayerColors.white,
            hoverBg: datalayerColors.greenAccent,
            hoverBorder: datalayerColors.greenAccent,
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: datalayerColors.white,
            selectedBg: datalayerColors.greenBright,
            selectedBorder: datalayerColors.greenBright,
            disabledText: 'rgba(26, 188, 156, 0.5)',
            disabledBg: 'rgba(26, 188, 156, 0.1)',
            disabledCounterBg: 'rgba(26, 188, 156, 0.05)',
            counterBg: 'rgba(26, 188, 156, 0.1)',
            counterFg: datalayerColors.greenAccent,
            hoverCounterFg: datalayerColors.white,
            disabledCounterFg: 'rgba(26, 188, 156, 0.5)',
          },
          danger: {
            text: '#f85149',
            hoverText: datalayerColors.white,
            hoverBg: '#da3633',
            hoverBorder: '#f85149',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: datalayerColors.white,
            selectedBg: '#b62324',
            selectedBorder: '#ff7b72',
            disabledText: 'rgba(248, 81, 73, 0.5)',
            disabledBg: 'rgba(248, 81, 73, 0.1)',
            disabledCounterBg: 'rgba(248, 81, 73, 0.05)',
            counterBg: 'rgba(248, 81, 73, 0.1)',
            counterFg: '#f85149',
            hoverCounterFg: datalayerColors.white,
            disabledCounterFg: 'rgba(248, 81, 73, 0.5)',
            icon: '#f85149',
          },
        },
      },
      shadows: {},
    },
  },
};

const { colorSchemes: primerSchemes, ...primerOthers } = cloneDeep(primerTheme);
const { colorSchemes: datalayerSchemes, ...datalayerOthers } =
  datalayerThemeDefs;

// Merge with the light theme to ensure all variables are defined.
export const datalayerTheme = merge(primerOthers, datalayerOthers, {
  colorSchemes: { light: {}, dark: {} },
});
datalayerTheme.colorSchemes.light = {
  colors: merge(primerSchemes.light.colors, datalayerSchemes.light.colors),
  shadows: merge(primerSchemes.light.shadows, datalayerSchemes.light.shadows),
};
datalayerTheme.colorSchemes.dark = {
  colors: merge(primerSchemes.dark.colors, datalayerSchemes.dark.colors),
  shadows: merge(primerSchemes.dark.shadows, datalayerSchemes.dark.shadows),
};

export default datalayerTheme;
