/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Generate a URL-friendly handle from a name.
 *
 * @param name - The name to convert to a handle
 * @param fallbackPrefix - Prefix for the fallback handle if name produces empty result
 * @returns URL-friendly handle string
 */
export function generateHandle(
  name: string,
  fallbackPrefix = 'project',
): string {
  const handle = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return handle || `${fallbackPrefix}-${Date.now()}`;
}
