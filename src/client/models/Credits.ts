/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Credits model for the Datalayer SDK.
 *
 * @module client/models/Credits
 */

import type { CreditsInfo, CreditReservation } from '../../api/iam/usage';

/**
 * Credits model representing user's available credits and usage.
 *
 * @example
 * ```typescript
 * const credits = await sdk.getCredits();
 * console.log(`Available: ${credits.available}`);
 * console.log(`Quota: ${credits.quota || 'unlimited'}`);
 *
 * // Calculate maximum runtime for an environment
 * const maxMinutes = credits.calculateMaxRuntimeMinutes(environment.burningRate);
 * ```
 */
export class Credits {
  /** @internal */
  _data: CreditsInfo;

  private _reservations: CreditReservation[];

  constructor(data: CreditsInfo, reservations: CreditReservation[] = []) {
    this._data = data;
    this._reservations = reservations;
  }

  /**
   * Available credits for the user.
   */
  get available(): number {
    return this._data.credits;
  }

  /**
   * Credit quota for the user.
   * Returns null if unlimited.
   */
  get quota(): number | null {
    return this._data.quota;
  }

  /**
   * Last update timestamp.
   */
  get lastUpdate(): string {
    return this._data.last_update;
  }

  /**
   * Active credit reservations.
   */
  get reservations(): CreditReservation[] {
    return [...this._reservations];
  }

  /**
   * Total reserved credits across all reservations.
   */
  get totalReserved(): number {
    return this._reservations.reduce((sum, r) => sum + r.credits, 0);
  }

  /**
   * Net available credits (available minus reserved).
   */
  get netAvailable(): number {
    return Math.max(0, this.available - this.totalReserved);
  }

  /**
   * Get runtime reservations (reservations that start with 'runtime-').
   */
  get runtimeReservations(): CreditReservation[] {
    return this._reservations.filter(r => r.id.startsWith('runtime-'));
  }

  /**
   * Check if there are any active runtime reservations.
   */
  get hasActiveRuntimes(): boolean {
    return this.runtimeReservations.length > 0;
  }

  /**
   * Calculate maximum runtime in minutes based on environment burning rate.
   *
   * @param burningRate - Credits consumed per hour
   * @returns Maximum runtime in minutes
   */
  calculateMaxRuntimeMinutes(burningRate: number): number {
    if (burningRate <= 0) return 0;
    const burningRatePerMinute = burningRate * 60;
    return Math.floor(this.netAvailable / burningRatePerMinute);
  }

  /**
   * Calculate credits needed for runtime duration.
   *
   * @param minutes - Runtime duration in minutes
   * @param burningRate - Credits consumed per hour
   * @returns Credits needed
   */
  calculateCreditsFromMinutes(minutes: number, burningRate: number): number {
    const burningRatePerMinute = burningRate * 60;
    return minutes * burningRatePerMinute;
  }

  /**
   * Check if user has enough credits for runtime.
   *
   * @param minutes - Runtime duration in minutes
   * @param burningRate - Credits consumed per hour
   * @returns True if user has enough credits
   */
  hasEnoughCreditsForRuntime(minutes: number, burningRate: number): boolean {
    const creditsNeeded = this.calculateCreditsFromMinutes(
      minutes,
      burningRate,
    );
    return this.netAvailable >= creditsNeeded;
  }

  /**
   * Convert to JSON representation.
   */
  toJSON(): CreditsInfo & { reservations: CreditReservation[] } {
    // FIXME
    return {
      ...this._data,
      reservations: this._reservations,
    };
  }

  /**
   * String representation of credits.
   */
  toString(): string {
    const quotaStr = this.quota !== null ? ` of ${this.quota}` : '';
    const reservedStr =
      this.totalReserved > 0 ? ` (${this.totalReserved} reserved)` : '';
    return `Credits: ${this.available}${quotaStr}${reservedStr}`;
  }
}
