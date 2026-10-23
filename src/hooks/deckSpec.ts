/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A deck's specification, as Spacer serves it: YAML.
 *
 * `GET /decks/{id}` inlines the specification as `model_s`, the text Spacer
 * stored — YAML, or JSON for a deck stored before the specification was
 * YAML, which the same parser reads (JSON is YAML). Saving sends the parsed
 * value back (`PUT /decks/{id}/model`), and Spacer writes it as YAML.
 *
 * @module hooks/deckSpec
 */

import { parse } from 'yaml';

/** The value a deck's `model_s` holds, or `undefined` when it holds none. */
export const parseDeckSpec = (text: unknown): unknown => {
  if (typeof text !== 'string' || !text.trim()) {
    return undefined;
  }
  return parse(text);
};
