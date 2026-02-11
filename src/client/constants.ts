/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Constants for the Datalayer Client.
 *
 * @module client/constants
 */

/**
 * Item types used throughout the Client and consuming applications.
 * These constants define the type identifiers for different Datalayer items.
 * Values match what the Datalayer API returns.
 */
export const ItemTypes = {
  NOTEBOOK: 'notebook',
  LEXICAL: 'document',
  EXERCISE: 'exercise',
  CELL: 'cell',
  SPACE: 'space',
  UNKNOWN: 'unknown',
} as const;

/**
 * Type representing valid item types.
 */
export type ItemType = (typeof ItemTypes)[keyof typeof ItemTypes];
