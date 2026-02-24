/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Lovely Theme for Primer React.
 *
 * Warm rose & magenta — soft and inviting.
 * Theming is applied via **CSS custom-property overrides**.
 */

import { theme as primerTheme } from '@primer/react';
import { lovelyColors } from '../colors';
import { type ThemeColorDefs, buildThemeStyles } from './createThemeCSSVars';

// Re-export so existing consumers keep working.
export { lovelyColors };

/* ── Light-mode colour definitions ───────────────────────────────────── */

const lovelyLight: ThemeColorDefs = {
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
};

/* ── Dark-mode colour definitions ────────────────────────────────────── */

const lovelyDark: ThemeColorDefs = {
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
};

/* ── Exports ─────────────────────────────────────────────────────────── */

/**
 * The Primer theme object.
 *
 * Since theming is now done entirely via CSS custom properties
 * (see `lovelyThemeStyles`), this is just the unmodified
 * default Primer theme kept for backward compatibility.
 */
export const lovelyTheme = primerTheme;

/** Comprehensive Primer CSS-variable overrides for light & dark mode. */
export const lovelyThemeStyles = buildThemeStyles(lovelyLight, lovelyDark);

export default lovelyTheme;
