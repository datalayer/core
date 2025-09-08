/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Datalayer Brand Colors
 * Official palette:
 * - datalayer-green-light: #2ECC71 (46, 204, 113)
 * - datalayer-green-main:  #1ABC9C (26, 188, 156)
 * - datalayer-green-dark:  #16A085 (22, 160, 133)
 * - datalayer-gray:        #59595C (89, 89, 92)
 * - datalayer-black:       #000000 (0, 0, 0)
 * - datalayer-white:       #FFFFFF (255, 255, 255)
 */

export const DATALAYER_PALETTE = {
  greenLight: '#2ECC71',
  greenMain: '#1ABC9C',
  greenDark: '#16A085',
  // Accessible variants (WCAG AA compliant)
  greenAccessible: '#16A085', // 3.28:1 ratio - meets UI component standards
  greenAccessibleHover: '#138D75', // 4.12:1 ratio - darker for hover states
  greenAccessibleDark: '#117964', // 5.33:1 ratio - even darker for high contrast needs
  // Red variants for error/delete actions
  redPrimary: '#DC3545', // 4.53:1 ratio - good contrast
  redHover: '#B02A37', // 6.5:1 ratio - excellent contrast
  redAccessible: '#C82333', // 4.93:1 ratio - accessible for light backgrounds
  // Neutral colors
  gray: '#59595C',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const DATALAYER_BRAND = {
  primary: DATALAYER_PALETTE.greenAccessibleDark, // High contrast: #117964 (5.33:1 ratio) - meets AA standard
  primaryHover: DATALAYER_PALETTE.greenAccessibleHover, // Darker hover state (4.12:1 ratio)
  primaryLight: DATALAYER_PALETTE.greenLight, // Light variant
  primaryDark: DATALAYER_PALETTE.greenAccessibleDark, // High contrast variant
} as const;

export const COLORS = {
  brand: DATALAYER_BRAND,
  palette: DATALAYER_PALETTE,
  success: DATALAYER_BRAND.primary,
  online: DATALAYER_BRAND.primary,
  text: {
    primary: DATALAYER_PALETTE.black,
    secondary: DATALAYER_PALETTE.gray,
    inverse: DATALAYER_PALETTE.white,
  },
  background: {
    primary: DATALAYER_PALETTE.white,
    secondary: '#F8F9FA', // Light gray for backgrounds
  },
} as const;
