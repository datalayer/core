/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The type of unit used for reporting memory usage.
 */
export type MemoryUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';

/**
 * The number of bytes in each memory unit.
 */
export const MEMORY_UNIT_LIMITS: {
  readonly [U in MemoryUnit]: number;
} = {
  B: 1,
  KB: 1024,
  MB: 1048576,
  GB: 1073741824,
  TB: 1099511627776,
  PB: 1125899906842624,
};

export function formatForDisplay(
  numBytes: number | undefined,
  units?: MemoryUnit | undefined,
): string {
  const lu = convertToLargestUnit(numBytes, units);
  return lu[0].toFixed(2) + ' ' + lu[1];
}

/**
 * Format a byte size value using a human-friendly unit.
 *
 * Examples: 0 B, 532 B, 1.2 KB, 24 MB, 1.45 GB
 */
export function formatByteSize(numBytes: number | string | null | undefined): string {
  const normalizedNumBytes =
    typeof numBytes === 'string' ? Number(numBytes) : numBytes;

  if (!Number.isFinite(normalizedNumBytes) || !normalizedNumBytes || normalizedNumBytes < 0) {
    return '0 B';
  }

  const [value, unit] = convertToLargestUnit(normalizedNumBytes);
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  const formattedValue = value
    .toFixed(decimals)
    .replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1');

  return `${formattedValue} ${unit}`;
}

/**
 * Given a number of bytes, convert to the most human-readable
 * format, (GB, TB, etc).
 * If "units" is given, convert to that scale
 */
export function convertToLargestUnit(
  numBytes: number | undefined,
  units?: MemoryUnit,
): [number, MemoryUnit] {
  if (!numBytes) {
    return [0, 'B'];
  }
  if (units && units in MEMORY_UNIT_LIMITS) {
    return [numBytes / MEMORY_UNIT_LIMITS[units], units];
  } else if (numBytes < MEMORY_UNIT_LIMITS.KB) {
    return [numBytes, 'B'];
  } else if (
    MEMORY_UNIT_LIMITS.KB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.MB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.KB, 'KB'];
  } else if (
    MEMORY_UNIT_LIMITS.MB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.GB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.MB, 'MB'];
  } else if (
    MEMORY_UNIT_LIMITS.GB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.TB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.GB, 'GB'];
  } else if (
    MEMORY_UNIT_LIMITS.TB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.PB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.TB, 'TB'];
  } else {
    return [numBytes / MEMORY_UNIT_LIMITS.PB, 'PB'];
  }
}
