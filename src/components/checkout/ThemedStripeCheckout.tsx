/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@primer/react';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import type { ICheckoutPortal } from '../../models';
import { StripeCheckout } from './StripeCheckout';

const readColorModeFromDom = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const rootMode = document.documentElement
    .getAttribute('data-color-mode')
    ?.toLowerCase();
  if (rootMode === 'dark' || rootMode === 'light') {
    return rootMode;
  }

  if (rootMode === 'auto') {
    const darkTheme = document.documentElement
      .getAttribute('data-dark-theme')
      ?.toLowerCase();
    if (darkTheme && darkTheme !== 'light') {
      return 'dark';
    }
  }

  const bodyMode = document.body
    ?.getAttribute('data-color-mode')
    ?.toLowerCase();
  if (bodyMode === 'dark' || bodyMode === 'light') {
    return bodyMode;
  }

  if (bodyMode === 'auto') {
    const darkTheme = document.body
      ?.getAttribute('data-dark-theme')
      ?.toLowerCase();
    if (darkTheme && darkTheme !== 'light') {
      return 'dark';
    }
  }

  const cssMode = readCssVar('--base-color-mode', '').toLowerCase();
  if (cssMode === 'dark' || cssMode === 'light') {
    return cssMode;
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

const readThemeColor = (names: string[], fallback: string) => {
  for (const name of names) {
    const value = readCssVar(name, '').trim();
    if (value) {
      return value;
    }
  }
  return fallback;
};

const themeColorFromPrimer = (
  theme: unknown,
  path: string[],
): string | null => {
  let cursor: unknown = theme;
  for (const key of path) {
    if (cursor && typeof cursor === 'object' && key in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }
  return typeof cursor === 'string' && cursor.trim() ? cursor.trim() : null;
};

const resolveAppearance = (
  mode: 'light' | 'dark',
  primerTheme?: unknown,
): StripeElementsOptions['appearance'] => {
  const isDark = mode === 'dark';

  const pick = (
    primerPath: string[],
    cssNames: string[],
    fallback: string,
  ): string => {
    const fromPrimer = primerTheme
      ? themeColorFromPrimer(primerTheme, primerPath)
      : null;
    if (fromPrimer) {
      return fromPrimer;
    }
    return readThemeColor(cssNames, fallback);
  };

  const colorPrimary = pick(
    ['colors', 'accent', 'fg'],
    ['--fgColor-accent', '--color-accent-fg', '--color-accent-emphasis'],
    isDark ? '#58a6ff' : '#0969da',
  );
  const colorText = pick(
    ['colors', 'fg', 'default'],
    ['--fgColor-default', '--color-fg-default'],
    isDark ? '#e6edf3' : '#1f2328',
  );
  const colorTextSecondary = pick(
    ['colors', 'fg', 'muted'],
    ['--fgColor-muted', '--color-fg-muted'],
    isDark ? '#8b949e' : '#59636e',
  );
  const colorBackground = pick(
    ['colors', 'canvas', 'default'],
    ['--bgColor-default', '--color-canvas-default'],
    isDark ? '#0d1117' : '#ffffff',
  );
  const colorSurface = pick(
    ['colors', 'canvas', 'subtle'],
    ['--bgColor-muted', '--color-canvas-subtle'],
    isDark ? '#161b22' : '#f6f8fa',
  );
  const colorBorder = pick(
    ['colors', 'border', 'default'],
    ['--borderColor-default', '--color-border-default'],
    isDark ? '#30363d' : '#d0d7de',
  );
  const colorDanger = pick(
    ['colors', 'danger', 'fg'],
    ['--fgColor-danger', '--color-danger-fg'],
    isDark ? '#ff7b72' : '#d1242f',
  );
  const colorSuccess = pick(
    ['colors', 'success', 'fg'],
    ['--fgColor-success', '--color-success-fg'],
    isDark ? '#3fb950' : '#1a7f37',
  );

  return {
    theme: isDark ? 'night' : 'stripe',
    variables: {
      colorPrimary,
      colorText,
      colorTextSecondary,
      colorBackground,
      colorDanger,
      colorSuccess,
      colorIcon: colorTextSecondary,
      colorIconHover: colorText,
      colorPrimaryText: colorBackground,
      colorTextPlaceholder: colorTextSecondary,
      borderRadius: '8px',
      spacingUnit: '4px',
      fontFamily: readThemeColor(
        ['--base-text-font-family', '--fontStack-sansSerif'],
        'system-ui, -apple-system, Segoe UI, sans-serif',
      ),
    },
    rules: {
      '.Input': {
        backgroundColor: colorBackground,
        border: `1px solid ${colorBorder}`,
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: `1px solid ${colorPrimary}`,
        boxShadow: `0 0 0 1px ${colorPrimary}`,
      },
      '.Label': {
        color: colorText,
      },
      '.Tab': {
        backgroundColor: colorSurface,
        color: colorTextSecondary,
      },
      '.Tab:hover': {
        color: colorText,
      },
      '.Tab--selected': {
        backgroundColor: colorPrimary,
        color: colorBackground,
      },
      '.Error': {
        color: colorDanger,
      },
      '.Text': {
        color: colorText,
      },
      '.Footer': {
        display: 'none',
      },
      '.TermsText': {
        display: 'none',
      },
      '.PoweredByStripe': {
        display: 'none',
      },
      '.p-PoweredByStripe': {
        display: 'none',
      },
    },
  };
};

export type ThemedStripeCheckoutProps = {
  checkoutPortal: ICheckoutPortal | null;
  accountUid?: string;
  /**
   * Primer color mode. Accepts 'light' | 'dark' | 'auto' | 'day' | 'night'.
   * If omitted, falls back to Primer's `useTheme()` context, then to DOM.
   */
  colorMode?: 'light' | 'dark' | 'auto' | 'day' | 'night' | string;
  /**
   * Primer theme object (e.g. from `useTheme().theme`). Used to derive
   * Stripe appearance tokens. If omitted, falls back to Primer context, then
   * to CSS variables on `:root`.
   */
  theme?: unknown;
};

export function ThemedStripeCheckout({
  checkoutPortal,
  accountUid,
  colorMode,
  theme,
}: ThemedStripeCheckoutProps) {
  // Fallback source: Primer's theme context (only if props are not provided).
  const primer = useTheme() as {
    colorMode?: string;
    resolvedColorMode?: string;
    theme?: unknown;
  };

  const effectiveTheme = theme ?? primer?.theme;

  const effectiveColorMode: 'light' | 'dark' = useMemo(() => {
    const value = String(
      colorMode ?? primer?.resolvedColorMode ?? primer?.colorMode ?? '',
    ).toLowerCase();
    if (value === 'night' || value === 'dark') return 'dark';
    if (value === 'day' || value === 'light') return 'light';
    return readColorModeFromDom();
  }, [colorMode, primer?.resolvedColorMode, primer?.colorMode]);

  const [appearance, setAppearance] = useState<
    StripeElementsOptions['appearance']
  >(() => resolveAppearance(effectiveColorMode, effectiveTheme));

  useEffect(() => {
    setAppearance(resolveAppearance(effectiveColorMode, effectiveTheme));
  }, [effectiveColorMode, effectiveTheme]);

  // Safety net: react to DOM attribute changes if no explicit prop driving updates.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const recompute = () =>
      setAppearance(resolveAppearance(effectiveColorMode, effectiveTheme));
    const observer = new MutationObserver(recompute);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-color-mode',
        'data-light-theme',
        'data-dark-theme',
        'style',
        'class',
      ],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-color-mode', 'style', 'class'],
      });
    }
    return () => observer.disconnect();
  }, [effectiveColorMode, effectiveTheme]);

  return (
    <StripeCheckout
      checkoutPortal={checkoutPortal}
      accountUid={accountUid}
      appearance={appearance}
    />
  );
}

export default ThemedStripeCheckout;
