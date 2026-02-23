/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';
import { theme as primerTheme } from '@primer/react';
import cloneDeep from 'lodash/cloneDeep.js';
import merge from 'lodash/merge.js';

/**
 * Spatial Theme – Cosmic & Space-Inspired
 * Deep blues, indigo, nebula purples — designed for dark-first usage.
 */
export const spatialColors = {
  // Core Neutrals
  black: '#0B1120', // Deep space — primary dark background
  gray: '#8892B0', // Nebula gray — secondary text
  white: '#F8FAFF', // Star white — primary light background

  // Indigo / Cosmic palette
  indigoBrand: '#4F46E5', // Core brand — headings, icons, dividers
  indigoAccent: '#6366F1', // Charts, highlights on dark surfaces
  indigoText: '#3730A3', // Accessible text & buttons on light (AA+)
  indigoTint: '#EEF2FF', // Soft background for callouts
  indigoBright: '#818CF8', // Highlights & glow on dark
  indigoHover: '#312E81', // Primary button hover
};

const spatialThemeDefs = {
  colorSchemes: {
    light: {
      colors: {
        canvas: {
          default: spatialColors.white,
        },
        fg: {
          default: '#1E1E3F',
          muted: spatialColors.gray,
          onEmphasis: spatialColors.white,
        },
        accent: {
          fg: spatialColors.indigoText,
          emphasis: spatialColors.indigoBrand,
          muted: spatialColors.indigoAccent,
        },
        success: {
          fg: spatialColors.indigoText,
          emphasis: spatialColors.indigoBrand,
          muted: spatialColors.indigoAccent,
        },
        btn: {
          text: '#1E1E3F',
          bg: spatialColors.white,
          border: '#C7D2FE',
          hoverBg: spatialColors.indigoTint,
          hoverBorder: spatialColors.gray,
          activeBg: spatialColors.indigoTint,
          activeBorder: spatialColors.gray,
          selectedBg: spatialColors.white,
          counterBg: spatialColors.gray,
          primary: {
            text: spatialColors.white,
            bg: spatialColors.indigoText,
            border: spatialColors.indigoText,
            hoverBg: spatialColors.indigoHover,
            hoverBorder: spatialColors.indigoHover,
            selectedBg: spatialColors.indigoHover,
            disabledText: 'rgba(255, 255, 255, 0.8)',
            disabledBg: '#B4B0D8',
            disabledBorder: '#B4B0D8',
            icon: spatialColors.white,
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: spatialColors.indigoText,
            hoverText: spatialColors.white,
            hoverBg: spatialColors.indigoText,
            hoverBorder: spatialColors.indigoText,
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: spatialColors.white,
            selectedBg: spatialColors.indigoHover,
            selectedBorder: spatialColors.indigoHover,
            disabledText: spatialColors.gray,
            disabledBg: spatialColors.indigoTint,
            disabledCounterBg: 'rgba(0, 0, 0, 0.05)',
            counterBg: 'rgba(0, 0, 0, 0.05)',
            counterFg: spatialColors.indigoText,
            hoverCounterFg: spatialColors.white,
            disabledCounterFg: spatialColors.gray,
          },
          danger: {
            text: '#d32f2f',
            hoverText: spatialColors.white,
            hoverBg: '#d32f2f',
            hoverBorder: '#d32f2f',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: spatialColors.white,
            selectedBg: '#b71c1c',
            selectedBorder: '#b71c1c',
            disabledText: 'rgba(211, 47, 47, 0.5)',
            disabledBg: spatialColors.indigoTint,
            disabledCounterBg: 'rgba(211, 47, 47, 0.05)',
            counterBg: 'rgba(211, 47, 47, 0.1)',
            counterFg: '#d32f2f',
            hoverCounterFg: spatialColors.white,
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
          default: spatialColors.black,
          subtle: '#111827',
        },
        fg: {
          default: '#E0E7FF',
          muted: '#94A3B8',
          onEmphasis: spatialColors.white,
        },
        accent: {
          fg: spatialColors.indigoAccent,
          emphasis: spatialColors.indigoBright,
          muted: spatialColors.indigoBrand,
          subtle: '#1E1B4B',
        },
        success: {
          fg: spatialColors.indigoAccent,
          emphasis: spatialColors.indigoBright,
          muted: spatialColors.indigoBrand,
          subtle: '#1E1B4B',
        },
        btn: {
          text: '#E0E7FF',
          bg: '#1E293B',
          border: 'rgba(199, 210, 254, 0.15)',
          hoverBg: '#334155',
          hoverBorder: '#94A3B8',
          activeBg: '#1E293B',
          activeBorder: '#64748B',
          selectedBg: '#0F172A',
          counterBg: '#334155',
          primary: {
            text: spatialColors.white,
            bg: spatialColors.indigoAccent,
            border: 'rgba(199, 210, 254, 0.15)',
            hoverBg: spatialColors.indigoBright,
            hoverBorder: 'rgba(199, 210, 254, 0.15)',
            selectedBg: spatialColors.indigoBright,
            disabledText: 'rgba(255, 255, 255, 0.5)',
            disabledBg: 'rgba(79, 70, 229, 0.35)',
            disabledBorder: 'rgba(79, 70, 229, 0.2)',
            icon: spatialColors.white,
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: spatialColors.indigoAccent,
            hoverText: spatialColors.white,
            hoverBg: spatialColors.indigoAccent,
            hoverBorder: spatialColors.indigoAccent,
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: spatialColors.white,
            selectedBg: spatialColors.indigoBright,
            selectedBorder: spatialColors.indigoBright,
            disabledText: 'rgba(99, 102, 241, 0.5)',
            disabledBg: 'rgba(99, 102, 241, 0.1)',
            disabledCounterBg: 'rgba(99, 102, 241, 0.05)',
            counterBg: 'rgba(99, 102, 241, 0.1)',
            counterFg: spatialColors.indigoAccent,
            hoverCounterFg: spatialColors.white,
            disabledCounterFg: 'rgba(99, 102, 241, 0.5)',
          },
          danger: {
            text: '#f85149',
            hoverText: spatialColors.white,
            hoverBg: '#da3633',
            hoverBorder: '#f85149',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: spatialColors.white,
            selectedBg: '#b62324',
            selectedBorder: '#ff7b72',
            disabledText: 'rgba(248, 81, 73, 0.5)',
            disabledBg: 'rgba(248, 81, 73, 0.1)',
            disabledCounterBg: 'rgba(248, 81, 73, 0.05)',
            counterBg: 'rgba(248, 81, 73, 0.1)',
            counterFg: '#f85149',
            hoverCounterFg: spatialColors.white,
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
const { colorSchemes: spatialSchemes, ...spatialOthers } = spatialThemeDefs;

export const spatialTheme = merge(primerOthers, spatialOthers, {
  colorSchemes: { light: {}, dark: {} },
});
spatialTheme.colorSchemes.light = {
  colors: merge(primerSchemes.light.colors, spatialSchemes.light.colors),
  shadows: merge(primerSchemes.light.shadows, spatialSchemes.light.shadows),
};
spatialTheme.colorSchemes.dark = {
  colors: merge(primerSchemes.dark.colors, spatialSchemes.dark.colors),
  shadows: merge(primerSchemes.dark.shadows, spatialSchemes.dark.shadows),
};

/** Spatial-themed CSS vars for DatalayerThemeProvider's `themeStyles` prop. */
export const spatialThemeStyles = {
  light: {
    backgroundColor: spatialColors.white,
    color: '#1E1E3F',
    fontSize: 'var(--text-body-size-medium)',
    '--brand-color-canvas-default': spatialColors.white,
    '--brand-color-text-default': '#1E1E3F',
    '--button-primary-bgColor-rest': spatialColors.indigoText,
    '--button-primary-bgColor-hover': spatialColors.indigoHover,
    '--button-primary-bgColor-active': spatialColors.indigoHover,
    '--button-primary-fgColor-rest': spatialColors.white,
    '--button-primary-borderColor-rest': spatialColors.indigoText,
    '--button-primary-borderColor-hover': spatialColors.indigoHover,
    '--color-btn-primary-bg': spatialColors.indigoText,
    '--color-btn-primary-hover-bg': spatialColors.indigoHover,
  } as CSSProperties,
  dark: {
    backgroundColor: spatialColors.black,
    color: '#E0E7FF',
    fontSize: 'var(--text-body-size-medium)',
    '--brand-color-canvas-default': spatialColors.black,
    '--brand-color-text-default': '#E0E7FF',
    '--button-primary-bgColor-rest': spatialColors.indigoAccent,
    '--button-primary-bgColor-hover': spatialColors.indigoBright,
    '--button-primary-bgColor-active': spatialColors.indigoBright,
    '--button-primary-fgColor-rest': spatialColors.white,
    '--button-primary-borderColor-rest': spatialColors.indigoAccent,
    '--button-primary-borderColor-hover': spatialColors.indigoBright,
    '--color-btn-primary-bg': spatialColors.indigoAccent,
    '--color-btn-primary-hover-bg': spatialColors.indigoBright,
  } as CSSProperties,
};

export default spatialTheme;
