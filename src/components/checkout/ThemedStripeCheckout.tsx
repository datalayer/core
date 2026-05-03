/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import type { ICheckoutPortal } from '../../models';
import { StripeCheckout } from './StripeCheckout';

const readCssVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

const resolveAppearance = (): StripeElementsOptions['appearance'] => {
  const mode = readCssVar('--base-color-mode', 'light').toLowerCase();
  const isDark = mode === 'dark';
  return {
    theme: isDark ? 'night' : 'stripe',
    variables: {
      colorPrimary: readCssVar('--fgColor-accent', '#0969da'),
      colorText: readCssVar('--fgColor-default', '#1f2328'),
      colorBackground: readCssVar('--bgColor-default', '#ffffff'),
      colorDanger: readCssVar('--fgColor-danger', '#d1242f'),
      colorSuccess: readCssVar('--fgColor-success', '#1a7f37'),
      borderRadius: '8px',
      spacingUnit: '4px',
    },
  };
};

export function ThemedStripeCheckout({
  checkoutPortal,
}: {
  checkoutPortal: ICheckoutPortal | null;
}) {
  const [appearance, setAppearance] = useState<
    StripeElementsOptions['appearance']
  >(() => resolveAppearance());

  useEffect(() => {
    setAppearance(resolveAppearance());
    if (typeof window === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      setAppearance(resolveAppearance());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-mode', 'style', 'class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <StripeCheckout checkoutPortal={checkoutPortal} appearance={appearance} />
  );
}

export default ThemedStripeCheckout;
