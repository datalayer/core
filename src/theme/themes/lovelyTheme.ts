/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';
import { theme as primerTheme } from '@primer/react';
import cloneDeep from 'lodash/cloneDeep.js';
import merge from 'lodash/merge.js';

/**
 * Lovely Theme – Warm & Pink-Inspired
 * Rose, magenta, blush — designed for light-first usage.
 */
export const lovelyColors = {
  // Core Neutrals
  black: '#1A0A14', // Deep plum — primary dark background
  gray: '#9D7A8F', // Mauve gray — secondary text
  white: '#FFF5F7', // Rose white — primary light background

  // Rose / Pink palette
  roseBrand: '#DB2777', // Core brand — headings, icons, dividers
  roseAccent: '#EC4899', // Charts, highlights on dark surfaces
  roseText: '#9D174D', // Accessible text & buttons on light (AA+)
  roseTint: '#FDF2F8', // Soft background for callouts
  roseBright: '#F472B6', // Highlights & glow on dark
  roseHover: '#831843', // Primary button hover
};

const lovelyThemeDefs = {
  colorSchemes: {
    light: {
      colors: {
        canvas: {
          default: lovelyColors.white,
        },
        fg: {
          default: '#2D1B28',
          muted: lovelyColors.gray,
          onEmphasis: '#FFFFFF',
        },
        accent: {
          fg: lovelyColors.roseText,
          emphasis: lovelyColors.roseBrand,
          muted: lovelyColors.roseAccent,
        },
        success: {
          fg: lovelyColors.roseText,
          emphasis: lovelyColors.roseBrand,
          muted: lovelyColors.roseAccent,
        },
        btn: {
          text: '#2D1B28',
          bg: '#FFFFFF',
          border: '#FBCFE8',
          hoverBg: lovelyColors.roseTint,
          hoverBorder: lovelyColors.gray,
          activeBg: lovelyColors.roseTint,
          activeBorder: lovelyColors.gray,
          selectedBg: '#FFFFFF',
          counterBg: lovelyColors.gray,
          primary: {
            text: '#FFFFFF',
            bg: lovelyColors.roseText,
            border: lovelyColors.roseText,
            hoverBg: lovelyColors.roseHover,
            hoverBorder: lovelyColors.roseHover,
            selectedBg: lovelyColors.roseHover,
            disabledText: 'rgba(255, 255, 255, 0.8)',
            disabledBg: '#D4A8BE',
            disabledBorder: '#D4A8BE',
            icon: '#FFFFFF',
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: lovelyColors.roseText,
            hoverText: '#FFFFFF',
            hoverBg: lovelyColors.roseText,
            hoverBorder: lovelyColors.roseText,
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: '#FFFFFF',
            selectedBg: lovelyColors.roseHover,
            selectedBorder: lovelyColors.roseHover,
            disabledText: lovelyColors.gray,
            disabledBg: lovelyColors.roseTint,
            disabledCounterBg: 'rgba(0, 0, 0, 0.05)',
            counterBg: 'rgba(0, 0, 0, 0.05)',
            counterFg: lovelyColors.roseText,
            hoverCounterFg: '#FFFFFF',
            disabledCounterFg: lovelyColors.gray,
          },
          danger: {
            text: '#d32f2f',
            hoverText: '#FFFFFF',
            hoverBg: '#d32f2f',
            hoverBorder: '#d32f2f',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: '#FFFFFF',
            selectedBg: '#b71c1c',
            selectedBorder: '#b71c1c',
            disabledText: 'rgba(211, 47, 47, 0.5)',
            disabledBg: lovelyColors.roseTint,
            disabledCounterBg: 'rgba(211, 47, 47, 0.05)',
            counterBg: 'rgba(211, 47, 47, 0.1)',
            counterFg: '#d32f2f',
            hoverCounterFg: '#FFFFFF',
            disabledCounterFg: 'rgba(211, 47, 47, 0.5)',
            icon: '#d32f2f',
          },
        },
      },
      shadows: {},
    },
    dark: {
      colors: {
        canvas: {
          default: lovelyColors.black,
          subtle: '#250E1D',
        },
        fg: {
          default: '#FCE7F3',
          muted: '#D4A5BD',
          onEmphasis: '#FFFFFF',
        },
        accent: {
          fg: lovelyColors.roseAccent,
          emphasis: lovelyColors.roseBright,
          muted: lovelyColors.roseBrand,
          subtle: '#3B0A2A',
        },
        success: {
          fg: lovelyColors.roseAccent,
          emphasis: lovelyColors.roseBright,
          muted: lovelyColors.roseBrand,
          subtle: '#3B0A2A',
        },
        btn: {
          text: '#FCE7F3',
          bg: '#2D0F23',
          border: 'rgba(251, 207, 232, 0.15)',
          hoverBg: '#3D1530',
          hoverBorder: '#D4A5BD',
          activeBg: '#2D0F23',
          activeBorder: '#9D7A8F',
          selectedBg: '#1A0A14',
          counterBg: '#3D1530',
          primary: {
            text: '#FFFFFF',
            bg: lovelyColors.roseAccent,
            border: 'rgba(251, 207, 232, 0.15)',
            hoverBg: lovelyColors.roseBright,
            hoverBorder: 'rgba(251, 207, 232, 0.15)',
            selectedBg: lovelyColors.roseBright,
            disabledText: 'rgba(255, 255, 255, 0.5)',
            disabledBg: 'rgba(219, 39, 119, 0.35)',
            disabledBorder: 'rgba(219, 39, 119, 0.2)',
            icon: '#FFFFFF',
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: lovelyColors.roseAccent,
            hoverText: '#FFFFFF',
            hoverBg: lovelyColors.roseAccent,
            hoverBorder: lovelyColors.roseAccent,
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: '#FFFFFF',
            selectedBg: lovelyColors.roseBright,
            selectedBorder: lovelyColors.roseBright,
            disabledText: 'rgba(236, 72, 153, 0.5)',
            disabledBg: 'rgba(236, 72, 153, 0.1)',
            disabledCounterBg: 'rgba(236, 72, 153, 0.05)',
            counterBg: 'rgba(236, 72, 153, 0.1)',
            counterFg: lovelyColors.roseAccent,
            hoverCounterFg: '#FFFFFF',
            disabledCounterFg: 'rgba(236, 72, 153, 0.5)',
          },
          danger: {
            text: '#f85149',
            hoverText: '#FFFFFF',
            hoverBg: '#da3633',
            hoverBorder: '#f85149',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: '#FFFFFF',
            selectedBg: '#b62324',
            selectedBorder: '#ff7b72',
            disabledText: 'rgba(248, 81, 73, 0.5)',
            disabledBg: 'rgba(248, 81, 73, 0.1)',
            disabledCounterBg: 'rgba(248, 81, 73, 0.05)',
            counterBg: 'rgba(248, 81, 73, 0.1)',
            counterFg: '#f85149',
            hoverCounterFg: '#FFFFFF',
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
const { colorSchemes: lovelySchemes, ...lovelyOthers } = lovelyThemeDefs;

export const lovelyTheme = merge(primerOthers, lovelyOthers, {
  colorSchemes: { light: {}, dark: {} },
});
lovelyTheme.colorSchemes.light = {
  colors: merge(primerSchemes.light.colors, lovelySchemes.light.colors),
  shadows: merge(primerSchemes.light.shadows, lovelySchemes.light.shadows),
};
lovelyTheme.colorSchemes.dark = {
  colors: merge(primerSchemes.dark.colors, lovelySchemes.dark.colors),
  shadows: merge(primerSchemes.dark.shadows, lovelySchemes.dark.shadows),
};

/** Lovely-themed CSS vars for DatalayerThemeProvider's `themeStyles` prop. */
export const lovelyThemeStyles = {
  light: {
    backgroundColor: lovelyColors.white,
    color: '#2D1B28',
    fontSize: 'var(--text-body-size-medium)',
    '--brand-color-canvas-default': lovelyColors.white,
    '--brand-color-text-default': '#2D1B28',
    '--button-primary-bgColor-rest': lovelyColors.roseText,
    '--button-primary-bgColor-hover': lovelyColors.roseHover,
    '--button-primary-bgColor-active': lovelyColors.roseHover,
    '--button-primary-fgColor-rest': '#FFFFFF',
    '--button-primary-borderColor-rest': lovelyColors.roseText,
    '--button-primary-borderColor-hover': lovelyColors.roseHover,
    '--color-btn-primary-bg': lovelyColors.roseText,
    '--color-btn-primary-hover-bg': lovelyColors.roseHover,
  } as CSSProperties,
  dark: {
    backgroundColor: lovelyColors.black,
    color: '#FCE7F3',
    fontSize: 'var(--text-body-size-medium)',
    '--brand-color-canvas-default': lovelyColors.black,
    '--brand-color-text-default': '#FCE7F3',
    '--button-primary-bgColor-rest': lovelyColors.roseAccent,
    '--button-primary-bgColor-hover': lovelyColors.roseBright,
    '--button-primary-bgColor-active': lovelyColors.roseBright,
    '--button-primary-fgColor-rest': '#FFFFFF',
    '--button-primary-borderColor-rest': lovelyColors.roseAccent,
    '--button-primary-borderColor-hover': lovelyColors.roseBright,
    '--color-btn-primary-bg': lovelyColors.roseAccent,
    '--color-btn-primary-hover-bg': lovelyColors.roseBright,
  } as CSSProperties,
};

export default lovelyTheme;
