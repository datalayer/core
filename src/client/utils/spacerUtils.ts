/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Utility functions for Spacer-related operations to avoid code duplication.
 * @module client/utils/spacerUtils
 */

import type { GetSpaceItemsResponse } from '../../models/Space2';
import type { DatalayerClient } from '../index';
import { Notebook2 } from '../../models/Notebook2';
import { Lexical2 } from '../../models/Lexical2';
import { ItemTypes } from '../constants';

/**
 * Convert raw space items from API response to model instances.
 * This utility function is shared between Space.getItems() and SpacerMixin.getSpaceItems()
 * to avoid code duplication.
 *
 * @param response - Raw API response containing space items
 * @param sdk - SDK instance to pass to model constructors
 * @returns Array of Notebook and Lexical model instances
 */
export function convertSpaceItemsToModels(
  items: GetSpaceItemsResponse['items'],
  sdk: DatalayerClient,
): (Notebook2 | Lexical2)[] {
  const modelItems: (Notebook2 | Lexical2)[] = [];

  for (const item of items) {
    // Check various possible type fields
    const itemType: string = (item as any).type_s;

    // Only include notebooks and lexicals
    if (itemType === ItemTypes.NOTEBOOK) {
      modelItems.push(new Notebook2(item as any, sdk));
    } else if (itemType === ItemTypes.LEXICAL) {
      modelItems.push(new Lexical2(item as any, sdk));
    }
    // Skip everything else (exercises, cells, etc.)
  }

  return modelItems;
}
