/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Compute the total consumption duration in seconds.
 * When `expiredAt` is undefined, duration is elapsed time since `startedAt`.
 */
export function getConsumptionDuration(
  startedAt: number,
  expiredAt?: number,
  nowSeconds = Date.now() / 1000,
): number {
  if (expiredAt !== undefined) {
    return Math.max(0, expiredAt - startedAt);
  }
  return Math.max(0, nowSeconds - startedAt);
}

/**
 * Compute credit consumption progress (0-100).
 * Mirrors ConsumptionBar logic:
 * - if no `expiredAt`, progress is 100
 * - otherwise progress is elapsed / duration clamped to [0, 100]
 */
export function getConsumptionProgress(
  startedAt: number,
  expiredAt?: number,
  nowSeconds = Date.now() / 1000,
): number {
  if (expiredAt === undefined) {
    return 100;
  }
  const duration = getConsumptionDuration(startedAt, expiredAt, nowSeconds);
  if (duration <= 0) {
    return 100;
  }
  const progress = ((nowSeconds - startedAt) / duration) * 100;
  return Math.min(Math.max(0, progress), 100);
}
