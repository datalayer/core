/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/** JSON values accepted at the Contents HTTP boundary. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const snakeToCamelKey = (key: string): string =>
  key.replace(/_([a-zA-Z0-9])/g, (_, character: string) =>
    character.toUpperCase()
  );

const camelToSnakeKey = (key: string): string =>
  key.replace(/([A-Z])/g, '_$1').toLowerCase();

const convertObject = (
  value: { [key: string]: JsonValue },
  keyConverter: (key: string) => string,
  valueConverter: (value: JsonValue) => JsonValue
): { [key: string]: JsonValue } => {
  const converted: { [key: string]: JsonValue } = {};
  for (const [key, item] of Object.entries(value)) {
    const convertedKey = keyConverter(key);
    if (Object.hasOwn(converted, convertedKey)) {
      throw new Error(`Contents field collision: ${key} -> ${convertedKey}`);
    }
    converted[convertedKey] = valueConverter(item);
  }
  return converted;
};

/** Recursively convert suffixless Python/API snake-case fields to camel case. */
export const contentsToCamelCase = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(contentsToCamelCase);
  }
  if (value !== null && typeof value === 'object') {
    return convertObject(value, snakeToCamelKey, contentsToCamelCase);
  }
  return value;
};

/** Recursively convert camel-case Contents client values to API snake case. */
export const contentsToSnakeCase = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(contentsToSnakeCase);
  }
  if (value !== null && typeof value === 'object') {
    return convertObject(value, camelToSnakeKey, contentsToSnakeCase);
  }
  return value;
};
