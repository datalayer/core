/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Matrix Theme for Primer React.
 *
 * Phosphor green on black — CRT terminal aesthetic.
 * Theming is applied via **CSS custom-property overrides**.
 */

import { theme as primerTheme } from '@primer/react';
import { matrixColors } from '../colors';
import { type ThemeColorDefs, buildThemeStyles } from './createThemeCSSVars';

// Re-export so existing consumers keep working.
export { matrixColors };

/* ── Light-mode colour definitions ───────────────────────────────────── */

const matrixLight: ThemeColorDefs = {
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
};

/* ── Dark-mode colour definitions ────────────────────────────────────── */

const matrixDark: ThemeColorDefs = {
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
};

/* ── Exports ─────────────────────────────────────────────────────────── */

/**
 * The Primer theme object.
 *
 * Since theming is now done entirely via CSS custom properties
 * (see `matrixThemeStyles`), this is just the unmodified
 * default Primer theme kept for backward compatibility.
 */
export const matrixTheme = primerTheme;

/** Comprehensive Primer CSS-variable overrides for light & dark mode. */
export const matrixThemeStyles = buildThemeStyles(matrixLight, matrixDark);

export default matrixTheme;
