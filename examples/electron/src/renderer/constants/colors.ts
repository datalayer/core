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
  gray: '#59595C',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const DATALAYER_BRAND = {
  primary: DATALAYER_PALETTE.greenMain, // Main brand color
  primaryHover: DATALAYER_PALETTE.greenDark, // Hover state
  primaryLight: DATALAYER_PALETTE.greenLight, // Light variant
  primaryDark: DATALAYER_PALETTE.greenDark, // Dark variant
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
