/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module sdk/client/utils/mixins
 * @description TypeScript mixin utilities for composing the DatalayerSDK class.
 */

/**
 * Type for a constructor function that can be used in mixins.
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Apply mixins to a base class.
 *
 * This utility function enables multiple inheritance-like behavior in TypeScript
 * by copying properties and methods from mixin classes to the target class.
 *
 * @param derivedCtor - The base class to extend
 * @param constructors - Array of mixin classes to apply
 *
 * @example
 * ```typescript
 * class Base {
 *   baseMethod() { return 'base'; }
 * }
 *
 * class MixinA {
 *   mixinAMethod() { return 'A'; }
 * }
 *
 * class MixinB {
 *   mixinBMethod() { return 'B'; }
 * }
 *
 * interface Combined extends Base, MixinA, MixinB {}
 * class Combined extends Base {}
 * applyMixins(Combined, [MixinA, MixinB]);
 *
 * const instance = new Combined();
 * instance.baseMethod(); // 'base'
 * instance.mixinAMethod(); // 'A'
 * instance.mixinBMethod(); // 'B'
 * ```
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
