/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';
import { theme as primerTheme } from '@primer/react';
import cloneDeep from 'lodash/cloneDeep.js';
import merge from 'lodash/merge.js';

/**
 * Matrix Theme – Terminal & Phosphor-Green
 *
 * Inspired by the iconic green-on-black aesthetic of The Matrix.
 * Dark-first, CRT feel. Uses Datalayer brand greens for accessible text
 * and introduces phosphor-green accents for the signature glow.
 */
export const matrixColors = {
  // Core Neutrals — CRT / terminal aesthetic
  black: '#0D0208', // Matrix void — near-black with faint warm undertone
  gray: '#4A7856', // Dim terminal gray-green — secondary text
  white: '#F0FFF0', // Honeydew — light bg with subtle green cast (CRT paper)

  // Green palette — Datalayer brand greens  + Matrix phosphor highlights
  greenBrand: '#16A085', // Datalayer brand — headings, icons, dividers
  greenAccent: '#1ABC9C', // Datalayer accent — icons, charts on dark surfaces
  greenText: '#117A65', // Datalayer text — accessible buttons & text on light (AA+)
  greenTint: '#E8F5E9', // Matrix-tinted soft background for callouts
  greenPhosphor: '#00FF41', // Iconic Matrix falling-code green — dark mode highlights
  greenGlow: '#39FF14', // Neon phosphor glow — brightest accent on dark
  greenHover: '#0E6655', // Datalayer hover — primary button hover
  greenTerminal: '#003B00', // Deep terminal — dark mode subtle/canvas
};

const matrixThemeDefs = {
  colorSchemes: {
    light: {
      colors: {
        canvas: {
          default: matrixColors.white,
        },
        fg: {
          default: '#0A2E1A',
          muted: matrixColors.gray,
          onEmphasis: matrixColors.white,
        },
        accent: {
          fg: matrixColors.greenText,
          emphasis: matrixColors.greenBrand,
          muted: matrixColors.greenAccent,
        },
        success: {
          fg: matrixColors.greenText,
          emphasis: matrixColors.greenBrand,
          muted: matrixColors.greenAccent,
        },
        btn: {
          text: '#0A2E1A',
          bg: matrixColors.white,
          border: '#A5D6A7',
          hoverBg: matrixColors.greenTint,
          hoverBorder: matrixColors.gray,
          activeBg: matrixColors.greenTint,
          activeBorder: matrixColors.gray,
          selectedBg: matrixColors.white,
          counterBg: matrixColors.gray,
          primary: {
            text: matrixColors.white,
            bg: matrixColors.greenText,
            border: matrixColors.greenText,
            hoverBg: matrixColors.greenHover,
            hoverBorder: matrixColors.greenHover,
            selectedBg: matrixColors.greenHover,
            disabledText: 'rgba(255, 255, 255, 0.8)',
            disabledBg: '#94C9B9',
            disabledBorder: '#94C9B9',
            icon: matrixColors.white,
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: matrixColors.greenText,
            hoverText: matrixColors.white,
            hoverBg: matrixColors.greenText,
            hoverBorder: matrixColors.greenText,
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: matrixColors.white,
            selectedBg: matrixColors.greenHover,
            selectedBorder: matrixColors.greenHover,
            disabledText: matrixColors.gray,
            disabledBg: matrixColors.greenTint,
            disabledCounterBg: 'rgba(0, 0, 0, 0.05)',
            counterBg: 'rgba(0, 0, 0, 0.05)',
            counterFg: matrixColors.greenText,
            hoverCounterFg: matrixColors.white,
            disabledCounterFg: matrixColors.gray,
          },
          danger: {
            text: '#d32f2f',
            hoverText: matrixColors.white,
            hoverBg: '#d32f2f',
            hoverBorder: '#d32f2f',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: matrixColors.white,
            selectedBg: '#b71c1c',
            selectedBorder: '#b71c1c',
            disabledText: 'rgba(211, 47, 47, 0.5)',
            disabledBg: matrixColors.greenTint,
            disabledCounterBg: 'rgba(211, 47, 47, 0.05)',
            counterBg: 'rgba(211, 47, 47, 0.1)',
            counterFg: '#d32f2f',
            hoverCounterFg: matrixColors.white,
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
          default: matrixColors.black,
          subtle: matrixColors.greenTerminal,
        },
        fg: {
          default: '#C8E6C9',
          muted: '#66BB6A',
          onEmphasis: matrixColors.white,
        },
        accent: {
          fg: matrixColors.greenPhosphor,
          emphasis: matrixColors.greenGlow,
          muted: matrixColors.greenAccent,
          subtle: '#0A1F0A',
        },
        success: {
          fg: matrixColors.greenPhosphor,
          emphasis: matrixColors.greenGlow,
          muted: matrixColors.greenAccent,
          subtle: '#0A1F0A',
        },
        btn: {
          text: '#C8E6C9',
          bg: '#0A1F0A',
          border: 'rgba(0, 255, 65, 0.15)',
          hoverBg: '#122812',
          hoverBorder: '#66BB6A',
          activeBg: '#0A1F0A',
          activeBorder: '#4A7856',
          selectedBg: '#061206',
          counterBg: '#122812',
          primary: {
            text: matrixColors.black,
            bg: matrixColors.greenPhosphor,
            border: 'rgba(0, 255, 65, 0.15)',
            hoverBg: matrixColors.greenGlow,
            hoverBorder: 'rgba(0, 255, 65, 0.15)',
            selectedBg: matrixColors.greenGlow,
            disabledText: 'rgba(13, 2, 8, 0.5)',
            disabledBg: 'rgba(0, 255, 65, 0.35)',
            disabledBorder: 'rgba(0, 255, 65, 0.2)',
            icon: matrixColors.black,
            counterBg: 'rgba(0, 0, 0, 0.2)',
          },
          outline: {
            text: matrixColors.greenPhosphor,
            hoverText: matrixColors.black,
            hoverBg: matrixColors.greenPhosphor,
            hoverBorder: matrixColors.greenPhosphor,
            hoverCounterBg: 'rgba(0, 0, 0, 0.2)',
            selectedText: matrixColors.black,
            selectedBg: matrixColors.greenGlow,
            selectedBorder: matrixColors.greenGlow,
            disabledText: 'rgba(0, 255, 65, 0.5)',
            disabledBg: 'rgba(0, 255, 65, 0.1)',
            disabledCounterBg: 'rgba(0, 255, 65, 0.05)',
            counterBg: 'rgba(0, 255, 65, 0.1)',
            counterFg: matrixColors.greenPhosphor,
            hoverCounterFg: matrixColors.black,
            disabledCounterFg: 'rgba(0, 255, 65, 0.5)',
          },
          danger: {
            text: '#f85149',
            hoverText: matrixColors.white,
            hoverBg: '#da3633',
            hoverBorder: '#f85149',
            hoverCounterBg: 'rgba(255, 255, 255, 0.2)',
            selectedText: matrixColors.white,
            selectedBg: '#b62324',
            selectedBorder: '#ff7b72',
            disabledText: 'rgba(248, 81, 73, 0.5)',
            disabledBg: 'rgba(248, 81, 73, 0.1)',
            disabledCounterBg: 'rgba(248, 81, 73, 0.05)',
            counterBg: 'rgba(248, 81, 73, 0.1)',
            counterFg: '#f85149',
            hoverCounterFg: matrixColors.white,
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
const { colorSchemes: matrixSchemes, ...matrixOthers } = matrixThemeDefs;

export const matrixTheme = merge(primerOthers, matrixOthers, {
  colorSchemes: { light: {}, dark: {} },
});
matrixTheme.colorSchemes.light = {
  colors: merge(primerSchemes.light.colors, matrixSchemes.light.colors),
  shadows: merge(primerSchemes.light.shadows, matrixSchemes.light.shadows),
};
matrixTheme.colorSchemes.dark = {
  colors: merge(primerSchemes.dark.colors, matrixSchemes.dark.colors),
  shadows: merge(primerSchemes.dark.shadows, matrixSchemes.dark.shadows),
};

/** Matrix-themed CSS vars for DatalayerThemeProvider's `themeStyles` prop. */
export const matrixThemeStyles = {
  light: {
    backgroundColor: matrixColors.white,
    color: '#0A2E1A',
    fontSize: 'var(--text-body-size-medium)',
    '--brand-color-canvas-default': matrixColors.white,
    '--brand-color-text-default': '#0A2E1A',
    '--button-primary-bgColor-rest': matrixColors.greenText,
    '--button-primary-bgColor-hover': matrixColors.greenHover,
    '--button-primary-bgColor-active': matrixColors.greenHover,
    '--button-primary-fgColor-rest': matrixColors.white,
    '--button-primary-borderColor-rest': matrixColors.greenText,
    '--button-primary-borderColor-hover': matrixColors.greenHover,
    '--color-btn-primary-bg': matrixColors.greenText,
    '--color-btn-primary-hover-bg': matrixColors.greenHover,
  } as CSSProperties,
  dark: {
    backgroundColor: matrixColors.black,
    color: '#C8E6C9',
    fontSize: 'var(--text-body-size-medium)',
    '--brand-color-canvas-default': matrixColors.black,
    '--brand-color-text-default': '#C8E6C9',
    '--button-primary-bgColor-rest': matrixColors.greenPhosphor,
    '--button-primary-bgColor-hover': matrixColors.greenGlow,
    '--button-primary-bgColor-active': matrixColors.greenGlow,
    '--button-primary-fgColor-rest': matrixColors.black,
    '--button-primary-borderColor-rest': matrixColors.greenPhosphor,
    '--button-primary-borderColor-hover': matrixColors.greenGlow,
    '--color-btn-primary-bg': matrixColors.greenPhosphor,
    '--color-btn-primary-hover-bg': matrixColors.greenGlow,
  } as CSSProperties,
};

export default matrixTheme;
