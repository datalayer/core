/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Credits level below which we refused to start a remote kernel
 * without explicit reservation.
 *
 * TODO what is a good LOW_CREDITS bar? - A better way would be to set it from a server settings or a cloud config.
 */
export const LOW_CREDITS = 3;

/**
 * User credits
 */
export interface ICredits {
  /**
   * User credits
   *
   * They are the remaining credits if {@link quota} is `null`
   * otherwise they are the credit consumed (remaining credits is `quota - credits`).
   */
  credits: number;
  /**
   * User credits quota
   */
  quota: number | null;
  /**
   * User credits last update as date ISO-formatted string.
   */
  last_update: string;
}

export interface ICheckoutPortal {
  /**
   * External checkout portal URL to open in a new tab.
   */
  url?: string;
  /**
   * Checkout portal route.
   */
  route?: string;
  /**
   * Whether the route will open a modal (true) or a page (false)
   */
  is_modal: boolean;
  /**
   * Portal metadata - content depends on the credits addon
   */
  metadata?: { [k: string]: any };
}

/**
 * Single resource credits reservation
 */
export interface ICreditsReservation {
  /**
   * Reservation ID
   */
  id: string;
  /**
   * Credits reserved
   */
  credits: number;
  /**
   * ID of the resource reserved
   */
  resource: string;
  /**
   * Last update for the reservation as date ISO-formatted string
   */
  last_update: string;
  /**
   * Credits burning rate
   */
  burning_rate: number;
  /**
   * Reservation start date as date ISO-formatted string
   */
  start_date?: string;
}
