/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Datalayer Brand Colors
 */

export const DATALAYER_BRAND = {
  primary: '#14a085',
  primaryHover: '#0f8069',
  primaryLight: '#1cbda0',
  primaryDark: '#0a6050',
} as const;

export const COLORS = {
  brand: DATALAYER_BRAND,
  success: DATALAYER_BRAND.primary,
  online: DATALAYER_BRAND.primary,
} as const;
