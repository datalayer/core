/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TypeScript mixin utilities for composing the DatalayerClient class.
 * @module client/utils/mixins
 */

/** Type for a constructor function that can be used in mixins. */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Apply mixins to a base class.
 * @param derivedCtor - The base class to extend
 * @param constructors - Array of mixin classes to apply
 */
export function applyMixins(derivedCtor: any, constructors: any[]): void {
  constructors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      if (name !== 'constructor') {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
            Object.create(null),
        );
      }
    });
  });
}
