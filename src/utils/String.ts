/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const strip = (s: string | undefined, max = 50) => {
  if (!s) {
    return "";
  }
  if (s.length > max) {
    return s.substring(0, max) + "…"
  }
  return s;
};
