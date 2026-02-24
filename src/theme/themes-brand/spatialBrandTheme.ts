/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';

/**
 * Spatial Brand Theme — Cosmic & Space-Inspired
 *
 * Overrides Primer Brand (`@primer/react-brand`) CSS custom properties
 * to produce an indigo / deep-blue aesthetic.  The tokens listed here
 * mirror the `--brand-color-*` and `--brand-button-*` variables defined
 * in `@primer/react-brand/lib/css/main.css`.
 *
 * Primer Brand components resolve their colours exclusively through
 * CSS custom properties scoped under `[data-color-mode]` selectors.
 * By providing higher-specificity inline style overrides through the
 * `DatalayerBrandThemeProvider`, we swap the entire palette without
 * touching the Brand stylesheet itself — the same technique the
 * VS Code extension uses to re-skin Primer for its webviews.
 */

import { spatialColors } from '../colors';

/* ── Light mode ─────────────────────────────────────────────────────── */

export const spatialBrandLight: CSSProperties = {
  // Canvas
  '--brand-color-canvas-default': spatialColors.white,
  '--brand-color-canvas-overlay': spatialColors.white,
  '--brand-color-canvas-inset': spatialColors.indigoTint,
  '--brand-color-canvas-subtle': spatialColors.indigoTint,

  // Text
  '--brand-color-text-default': '#1E1E3F',
  '--brand-color-text-muted': spatialColors.gray,
  '--brand-color-text-subtle': '#A0AEC0',
  '--brand-color-text-onEmphasis': spatialColors.white,

  // Accent
  '--brand-color-accent-primary': spatialColors.indigoBrand,
  '--brand-color-accent-secondary': spatialColors.indigoAccent,

  // Borders
  '--brand-color-border-default': '#C7D2FE',
  '--brand-color-border-muted': '#DDD6FE',
  '--brand-color-border-subtle': spatialColors.indigoTint,

  // Focus
  '--brand-color-focus': spatialColors.indigoBrand,

  // Neutral
  '--brand-color-neutral-emphasisPlus': '#1E1E3F',
  '--brand-color-neutral-emphasis': spatialColors.gray,
  '--brand-color-neutral-muted': 'rgba(99, 102, 241, 0.20)',
  '--brand-color-neutral-subtle': 'rgba(99, 102, 241, 0.08)',

  // Success / Error (keep semantic)
  '--brand-color-success-fg': '#1a7f37',
  '--brand-color-success-emphasis': '#2da44e',
  '--brand-color-success-muted': 'rgba(75, 195, 107, 0.6)',
  '--brand-color-success-subtle': '#dafbe1',
  '--brand-color-error-fg': '#d32f2f',
  '--brand-color-error-emphasis': '#d32f2f',
  '--brand-color-error-muted': 'rgba(255, 135, 133, 0.6)',
  '--brand-color-error-subtle': '#ffdcd7',

  // Buttons — primary
  '--brand-button-primary-bgColor-rest': spatialColors.indigoText,
  '--brand-button-primary-bgColor-hover': spatialColors.indigoHover,
  '--brand-button-primary-bgColor-active': spatialColors.indigoHover,
  '--brand-button-primary-bgColor-disabled': '#B4B0D8',
  '--brand-button-primary-borderColor-rest': spatialColors.indigoText,
  '--brand-button-primary-borderColor-hover': spatialColors.indigoHover,
  '--brand-button-primary-borderColor-active': spatialColors.indigoHover,
  '--brand-button-primary-borderColor-disabled': '#B4B0D8',
  '--brand-button-primary-fgColor-rest': spatialColors.white,
  '--brand-button-primary-fgColor-disabled': 'rgba(255, 255, 255, 0.5)',

  // Buttons — accent
  '--brand-button-accent-bgColor-rest': spatialColors.indigoBrand,
  '--brand-button-accent-bgColor-hover': spatialColors.indigoAccent,
  '--brand-button-accent-bgColor-active': spatialColors.indigoBrand,
  '--brand-button-accent-bgColor-disabled': '#B4B0D8',
  '--brand-button-accent-fgColor-rest': spatialColors.white,
  '--brand-button-accent-fgColor-disabled': 'rgba(255, 255, 255, 0.5)',

  // Buttons — secondary
  '--brand-button-secondary-bgColor-rest': 'transparent',
  '--brand-button-secondary-borderColor-rest': 'rgba(79, 70, 229, 0.25)',
  '--brand-button-secondary-borderColor-hover': 'rgba(79, 70, 229, 0.5)',
  '--brand-button-secondary-borderColor-active': 'rgba(79, 70, 229, 0.5)',
  '--brand-button-secondary-fgColor-rest': spatialColors.indigoText,
  '--brand-button-secondary-fgColor-disabled': '#B4B0D8',

  // Applied styles
  backgroundColor: spatialColors.white,
  color: '#1E1E3F',
} as CSSProperties;

/* ── Dark mode ──────────────────────────────────────────────────────── */

export const spatialBrandDark: CSSProperties = {
  // Canvas
  '--brand-color-canvas-default': spatialColors.black,
  '--brand-color-canvas-overlay': '#111827',
  '--brand-color-canvas-inset': spatialColors.black,
  '--brand-color-canvas-subtle': '#111827',

  // Text
  '--brand-color-text-default': '#E0E7FF',
  '--brand-color-text-muted': '#94A3B8',
  '--brand-color-text-subtle': '#64748B',
  '--brand-color-text-onEmphasis': spatialColors.white,

  // Accent
  '--brand-color-accent-primary': spatialColors.indigoAccent,
  '--brand-color-accent-secondary': spatialColors.indigoBright,

  // Borders
  '--brand-color-border-default': 'rgba(199, 210, 254, 0.15)',
  '--brand-color-border-muted': 'rgba(199, 210, 254, 0.10)',
  '--brand-color-border-subtle': 'rgba(199, 210, 254, 0.06)',

  // Focus
  '--brand-color-focus': spatialColors.indigoAccent,

  // Neutral
  '--brand-color-neutral-emphasisPlus': '#94A3B8',
  '--brand-color-neutral-emphasis': '#64748B',
  '--brand-color-neutral-muted': 'rgba(99, 102, 241, 0.25)',
  '--brand-color-neutral-subtle': 'rgba(99, 102, 241, 0.12)',

  // Success / Error
  '--brand-color-success-fg': '#3fb950',
  '--brand-color-success-emphasis': '#238636',
  '--brand-color-success-muted': 'rgba(46, 158, 66, 0.6)',
  '--brand-color-success-subtle': 'rgba(46, 158, 66, 0.85)',
  '--brand-color-error-fg': '#f85149',
  '--brand-color-error-emphasis': '#da3633',
  '--brand-color-error-muted': 'rgba(248, 82, 73, 0.6)',
  '--brand-color-error-subtle': 'rgba(248, 82, 73, 0.85)',

  // Buttons — primary
  '--brand-button-primary-bgColor-rest': spatialColors.indigoAccent,
  '--brand-button-primary-bgColor-hover': spatialColors.indigoBright,
  '--brand-button-primary-bgColor-active': spatialColors.indigoBright,
  '--brand-button-primary-bgColor-disabled': 'rgba(79, 70, 229, 0.35)',
  '--brand-button-primary-borderColor-rest': 'rgba(199, 210, 254, 0.15)',
  '--brand-button-primary-borderColor-hover': 'rgba(199, 210, 254, 0.15)',
  '--brand-button-primary-borderColor-active': 'rgba(199, 210, 254, 0.15)',
  '--brand-button-primary-borderColor-disabled': 'rgba(79, 70, 229, 0.2)',
  '--brand-button-primary-fgColor-rest': spatialColors.white,
  '--brand-button-primary-fgColor-disabled': 'rgba(255, 255, 255, 0.5)',

  // Buttons — accent
  '--brand-button-accent-bgColor-rest': spatialColors.indigoBrand,
  '--brand-button-accent-bgColor-hover': spatialColors.indigoAccent,
  '--brand-button-accent-bgColor-active': spatialColors.indigoBrand,
  '--brand-button-accent-bgColor-disabled': 'rgba(79, 70, 229, 0.35)',
  '--brand-button-accent-fgColor-rest': spatialColors.white,
  '--brand-button-accent-fgColor-disabled': 'rgba(255, 255, 255, 0.5)',

  // Buttons — secondary
  '--brand-button-secondary-bgColor-rest': 'transparent',
  '--brand-button-secondary-borderColor-rest': 'rgba(199, 210, 254, 0.15)',
  '--brand-button-secondary-borderColor-hover': 'rgba(199, 210, 254, 0.3)',
  '--brand-button-secondary-borderColor-active': 'rgba(199, 210, 254, 0.3)',
  '--brand-button-secondary-fgColor-rest': '#E0E7FF',
  '--brand-button-secondary-fgColor-disabled': 'rgba(99, 102, 241, 0.5)',

  // Applied styles
  backgroundColor: spatialColors.black,
  color: '#E0E7FF',
} as CSSProperties;

/**
 * Spatial Brand Theme — combined light + dark overrides.
 *
 * Pass to `DatalayerBrandThemeProvider`'s `brandTheme` prop.
 */
export const spatialBrandTheme = {
  light: spatialBrandLight,
  dark: spatialBrandDark,
};

export type BrandTheme = {
  light: CSSProperties;
  dark: CSSProperties;
};
