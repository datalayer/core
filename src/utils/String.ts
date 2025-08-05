/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
