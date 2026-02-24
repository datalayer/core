/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type CSSProperties } from 'react';

/* ─── Colour-definition structure ─────────────────────────────────────── */

/**
 * Structured colour definitions that mirror the *old* Primer
 * `colorSchemes.*.colors` shape.  Each theme file provides one of
 * these for light mode and one for dark mode.
 *
 * The {@link colorDefsToCSS} helper converts them into a flat
 * `CSSProperties` bag of Primer CSS custom-property overrides so
 * the `<DatalayerThemeProvider>` can apply them via
 * `<BaseStyles style={…}>`.
 */
export interface ThemeColorDefs {
  /* Background / Canvas */
  canvas: {
    default: string;
    subtle?: string;
  };

  /* Foreground / Text */
  fg: {
    default: string;
    muted: string;
    onEmphasis: string;
  };

  /* Accent (brand colour) */
  accent: {
    fg: string;
    emphasis: string;
    muted: string;
    subtle?: string;
  };

  /* Success (reused for the brand in most themes) */
  success: {
    fg: string;
    emphasis: string;
    muted: string;
    subtle?: string;
  };

  /* Default button */
  btn: {
    text: string;
    bg: string;
    border: string;
    hoverBg: string;
    hoverBorder: string;
    activeBg: string;
    activeBorder: string;
    selectedBg: string;
    counterBg: string;

    /* Primary button */
    primary: {
      text: string;
      bg: string;
      border: string;
      hoverBg: string;
      hoverBorder: string;
      selectedBg: string;
      disabledText: string;
      disabledBg: string;
      disabledBorder: string;
      icon: string;
      counterBg: string;
    };

    /* Outline button */
    outline: {
      text: string;
      hoverText: string;
      hoverBg: string;
      hoverBorder: string;
      hoverCounterBg: string;
      selectedText: string;
      selectedBg: string;
      selectedBorder: string;
      disabledText: string;
      disabledBg: string;
      disabledCounterBg: string;
      counterBg: string;
      counterFg: string;
      hoverCounterFg: string;
      disabledCounterFg: string;
    };

    /* Danger button */
    danger: {
      text: string;
      hoverText: string;
      hoverBg: string;
      hoverBorder: string;
      hoverCounterBg: string;
      selectedText: string;
      selectedBg: string;
      selectedBorder: string;
      disabledText: string;
      disabledBg: string;
      disabledCounterBg: string;
      counterBg: string;
      counterFg: string;
      hoverCounterFg: string;
      disabledCounterFg: string;
      icon: string;
    };
  };
}

/* ─── Helper ──────────────────────────────────────────────────────────── */

/**
 * Convert a structured `ThemeColorDefs` object into a flat
 * `CSSProperties` bag of Primer React CSS custom-property overrides.
 *
 * These variables are the *functional tokens* consumed by Primer
 * React components (sourced from `@primer/primitives`).  Setting
 * them on a parent element is enough to retheme every Primer
 * component in the sub-tree.
 *
 * ### Variable families covered
 *
 * | Family           | Example variable                       |
 * |------------------|----------------------------------------|
 * | Background       | `--bgColor-default`                    |
 * | Foreground       | `--fgColor-default`                    |
 * | Border           | `--borderColor-default`                |
 * | Link             | `--fgColor-link`                       |
 * | Accent / Success | `--bgColor-accent-emphasis`            |
 * | Default button   | `--button-default-bgColor-rest`        |
 * | Primary button   | `--button-primary-bgColor-rest`        |
 * | Outline button   | `--button-outline-fgColor-rest`        |
 * | Danger button    | `--button-danger-bgColor-hover`        |
 * | Button counters  | `--buttonCounter-primary-bgColor-rest` |
 * | Legacy aliases   | `--color-btn-primary-bg`               |
 * | Brand (custom)   | `--brand-color-canvas-default`         |
 */
export function colorDefsToCSS(defs: ThemeColorDefs): CSSProperties {
  const optional: Record<string, string> = {};

  if (defs.canvas.subtle) {
    optional['--bgColor-muted'] = defs.canvas.subtle;
  }
  if (defs.accent.subtle) {
    optional['--bgColor-accent-subtle'] = defs.accent.subtle;
  }
  if (defs.success.subtle) {
    optional['--bgColor-success-subtle'] = defs.success.subtle;
  }

  return {
    /* ── Canvas / Background ─────────────────────────────────────── */
    '--bgColor-default': defs.canvas.default,
    '--bgColor-inset': defs.canvas.default,
    ...optional,

    /* ── Foreground / Text ───────────────────────────────────────── */
    '--fgColor-default': defs.fg.default,
    '--fgColor-muted': defs.fg.muted,
    '--fgColor-onEmphasis': defs.fg.onEmphasis,

    /* ── Links ───────────────────────────────────────────────────── */
    '--fgColor-link': defs.accent.fg,

    /* ── Accent ──────────────────────────────────────────────────── */
    '--fgColor-accent': defs.accent.fg,
    '--bgColor-accent-emphasis': defs.accent.emphasis,
    '--bgColor-accent-muted': defs.accent.muted,
    '--borderColor-accent-emphasis': defs.accent.emphasis,
    '--borderColor-accent-muted': defs.accent.muted,

    /* ── Success ─────────────────────────────────────────────────── */
    '--fgColor-success': defs.success.fg,
    '--bgColor-success-emphasis': defs.success.emphasis,
    '--bgColor-success-muted': defs.success.muted,
    '--borderColor-success-emphasis': defs.success.emphasis,
    '--borderColor-success-muted': defs.success.muted,

    /* ── Border (generic) ────────────────────────────────────────── */
    '--borderColor-default': defs.btn.border,
    '--borderColor-muted': defs.btn.border,

    /* ── Default button ──────────────────────────────────────────── */
    '--button-default-fgColor-rest': defs.btn.text,
    '--button-default-bgColor-rest': defs.btn.bg,
    '--button-default-borderColor-rest': defs.btn.border,
    '--button-default-bgColor-hover': defs.btn.hoverBg,
    '--button-default-borderColor-hover': defs.btn.hoverBorder,
    '--button-default-bgColor-active': defs.btn.activeBg,
    '--button-default-borderColor-active': defs.btn.activeBorder,
    '--button-default-bgColor-selected': defs.btn.selectedBg,
    '--button-default-bgColor-disabled': defs.btn.bg,
    '--button-default-borderColor-disabled': defs.btn.border,
    '--buttonCounter-default-bgColor-rest': defs.btn.counterBg,
    '--buttonCounter-default-fgColor-rest': defs.btn.text,

    /* ── Primary button ──────────────────────────────────────────── */
    '--button-primary-fgColor-rest': defs.btn.primary.text,
    '--button-primary-bgColor-rest': defs.btn.primary.bg,
    '--button-primary-borderColor-rest': defs.btn.primary.border,
    '--button-primary-bgColor-hover': defs.btn.primary.hoverBg,
    '--button-primary-borderColor-hover': defs.btn.primary.hoverBorder,
    '--button-primary-bgColor-active': defs.btn.primary.selectedBg,
    '--button-primary-borderColor-active': defs.btn.primary.hoverBorder,
    '--button-primary-fgColor-disabled': defs.btn.primary.disabledText,
    '--button-primary-bgColor-disabled': defs.btn.primary.disabledBg,
    '--button-primary-borderColor-disabled': defs.btn.primary.disabledBorder,
    '--button-primary-iconColor-rest': defs.btn.primary.icon,
    '--buttonCounter-primary-bgColor-rest': defs.btn.primary.counterBg,
    '--buttonCounter-primary-fgColor-rest': defs.btn.primary.text,

    /* ── Outline button ──────────────────────────────────────────── */
    '--button-outline-fgColor-rest': defs.btn.outline.text,
    '--button-outline-bgColor-rest': 'transparent',
    '--button-outline-borderColor-rest': defs.btn.outline.text,
    '--button-outline-fgColor-hover': defs.btn.outline.hoverText,
    '--button-outline-bgColor-hover': defs.btn.outline.hoverBg,
    '--button-outline-borderColor-hover': defs.btn.outline.hoverBorder,
    '--button-outline-fgColor-active': defs.btn.outline.selectedText,
    '--button-outline-bgColor-active': defs.btn.outline.selectedBg,
    '--button-outline-borderColor-active': defs.btn.outline.selectedBorder,
    '--button-outline-fgColor-disabled': defs.btn.outline.disabledText,
    '--button-outline-bgColor-disabled': defs.btn.outline.disabledBg,
    '--buttonCounter-outline-bgColor-rest': defs.btn.outline.counterBg,
    '--buttonCounter-outline-fgColor-rest': defs.btn.outline.counterFg,
    '--buttonCounter-outline-bgColor-hover': defs.btn.outline.hoverCounterBg,
    '--buttonCounter-outline-fgColor-hover': defs.btn.outline.hoverCounterFg,
    '--buttonCounter-outline-fgColor-disabled':
      defs.btn.outline.disabledCounterFg,
    '--buttonCounter-outline-bgColor-disabled':
      defs.btn.outline.disabledCounterBg,

    /* ── Danger button ───────────────────────────────────────────── */
    '--button-danger-fgColor-rest': defs.btn.danger.text,
    '--button-danger-bgColor-rest': 'transparent',
    '--button-danger-borderColor-rest': defs.btn.danger.text,
    '--button-danger-fgColor-hover': defs.btn.danger.hoverText,
    '--button-danger-bgColor-hover': defs.btn.danger.hoverBg,
    '--button-danger-borderColor-hover': defs.btn.danger.hoverBorder,
    '--button-danger-fgColor-active': defs.btn.danger.selectedText,
    '--button-danger-bgColor-active': defs.btn.danger.selectedBg,
    '--button-danger-borderColor-active': defs.btn.danger.selectedBorder,
    '--button-danger-fgColor-disabled': defs.btn.danger.disabledText,
    '--button-danger-bgColor-disabled': defs.btn.danger.disabledBg,
    '--button-danger-iconColor-rest': defs.btn.danger.icon,
    '--button-danger-iconColor-hover': defs.btn.danger.hoverText,
    '--buttonCounter-danger-bgColor-rest': defs.btn.danger.counterBg,
    '--buttonCounter-danger-fgColor-rest': defs.btn.danger.counterFg,
    '--buttonCounter-danger-bgColor-hover': defs.btn.danger.hoverCounterBg,
    '--buttonCounter-danger-fgColor-hover': defs.btn.danger.hoverCounterFg,
    '--buttonCounter-danger-fgColor-disabled':
      defs.btn.danger.disabledCounterFg,
    '--buttonCounter-danger-bgColor-disabled':
      defs.btn.danger.disabledCounterBg,

    /* ── Invisible button (inherit from defaults) ────────────────── */
    '--button-invisible-fgColor-rest': defs.fg.default,
    '--button-invisible-bgColor-hover': defs.btn.hoverBg,
    '--button-invisible-fgColor-hover': defs.fg.default,
    '--button-invisible-bgColor-active': defs.btn.activeBg,
    '--button-invisible-fgColor-active': defs.fg.default,
    '--button-invisible-fgColor-disabled': defs.fg.muted,
    '--button-invisible-iconColor-rest': defs.fg.muted,
    '--button-invisible-iconColor-hover': defs.fg.default,
    '--button-invisible-iconColor-disabled': defs.fg.muted,

    /* ── Legacy / compat aliases ─────────────────────────────────── */
    '--color-btn-primary-bg': defs.btn.primary.bg,
    '--color-btn-primary-hover-bg': defs.btn.primary.hoverBg,

    /* ── Datalayer brand tokens (consumed by custom components) ─── */
    '--brand-color-canvas-default': defs.canvas.default,
    '--brand-color-text-default': defs.fg.default,
  } as CSSProperties;
}

/* ─── Convenience types ───────────────────────────────────────────────── */

/** Light + dark CSS-property pairs for the `themeStyles` prop. */
export interface ThemeStyles {
  light: CSSProperties;
  dark: CSSProperties;
}

/**
 * Build a complete `ThemeStyles` object from light / dark
 * `ThemeColorDefs`.  The result is ready to pass straight to
 * `<DatalayerThemeProvider themeStyles={…}>`.
 */
export function buildThemeStyles(
  light: ThemeColorDefs,
  dark: ThemeColorDefs,
): ThemeStyles {
  return {
    light: {
      backgroundColor: light.canvas.default,
      color: light.fg.default,
      fontSize: 'var(--text-body-size-medium)',
      ...colorDefsToCSS(light),
    } as CSSProperties,
    dark: {
      backgroundColor: dark.canvas.default,
      color: dark.fg.default,
      fontSize: 'var(--text-body-size-medium)',
      ...colorDefsToCSS(dark),
    } as CSSProperties,
  };
}
