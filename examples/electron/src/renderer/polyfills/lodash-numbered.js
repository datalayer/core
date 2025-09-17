/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * CRITICAL POLYFILLS - MUST RUN FIRST
 * These polyfills MUST execute synchronously before any other code
 * to prevent temporal dead zone errors with lodash functions
 */

// Execute immediately - no function wrapper
(function () {
  // Critical lodash internal functions that must be available before any other code runs

  // baseGetTag polyfills for all numbered variations
  for (let i = 1; i <= 10; i++) {
    const varName = 'baseGetTag$' + i;
    if (typeof globalThis[varName] === 'undefined') {
      globalThis[varName] = function (value) {
        if (value == null) {
          return value === undefined ? '[object Undefined]' : '[object Null]';
        }
        return Object.prototype.toString.call(value);
      };
    }
  }

  // base function polyfills for all numbered variations
  for (let i = 1; i <= 10; i++) {
    const varName = 'base$' + i;
    if (typeof globalThis[varName] === 'undefined') {
      globalThis[varName] = function (object, source) {
        return object && source;
      };
    }
  }

  // defineProperty function (used by baseSetToString and others)
  for (let i = 1; i <= 10; i++) {
    const varName = 'defineProperty$' + i;
    if (typeof globalThis[varName] === 'undefined') {
      globalThis[varName] = function (obj, key, descriptor) {
        if (obj && typeof obj === 'object' && key != null) {
          try {
            return Object.defineProperty(obj, key, descriptor);
          } catch (e) {
            // Fallback to simple assignment if defineProperty fails
            if (
              descriptor &&
              Object.prototype.hasOwnProperty.call(descriptor, 'value')
            ) {
              obj[key] = descriptor.value;
            }
            return obj;
          }
        }
        return obj;
      };
    }
  }

  // Make defineProperty available without number suffix too
  if (typeof globalThis.defineProperty === 'undefined') {
    globalThis.defineProperty = globalThis.defineProperty$1;
  }

  console.log(
    '[Critical Polyfills] ✅ Applied baseGetTag$1-$10, base$1-$10, defineProperty$1-$10'
  );

  // CRITICAL: Override Object.defineProperty to handle non-extensible objects gracefully
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function (obj, prop, descriptor) {
    try {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (e) {
      // If the object is not extensible, try simple assignment as fallback
      if (
        e.message.includes('not extensible') ||
        e.message.includes('Cannot add property')
      ) {
        if (descriptor && typeof descriptor.value !== 'undefined') {
          try {
            obj[prop] = descriptor.value;
            return obj;
          } catch (e2) {
            console.warn(
              '[Critical Polyfills] Could not add property',
              prop,
              'to non-extensible object, ignoring'
            );
            return obj;
          }
        }
      }
      throw e;
    }
  };

  console.log(
    '[Critical Polyfills] ✅ Patched Object.defineProperty for non-extensible objects'
  );
})();
