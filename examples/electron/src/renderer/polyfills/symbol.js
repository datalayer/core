/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Symbol Polyfill
 * This MUST be loaded before React or any other library that uses Symbol.for
 * Provides a complete Symbol implementation for production builds
 */

(function () {
  'use strict';

  // Check if Symbol already exists and is fully functional
  if (
    typeof Symbol !== 'undefined' &&
    typeof Symbol.for === 'function' &&
    typeof Symbol.keyFor === 'function'
  ) {
    console.log('[Symbol Polyfill] Native Symbol detected, skipping polyfill');
    return;
  }

  console.log('[Symbol Polyfill] Installing Symbol polyfill...');

  // Internal registry for Symbol.for and Symbol.keyFor
  const globalSymbolRegistry = {};
  let symbolCounter = 0;

  // Create Symbol constructor or enhance existing one
  const SymbolPolyfill =
    typeof Symbol === 'function'
      ? Symbol
      : function Symbol(description) {
          // Create a unique identifier
          const key = '@@Symbol(' + (description || '') + ')_' + ++symbolCounter;

          // Return a unique object that acts like a symbol
          // In older environments, we use a string as fallback
          if (typeof Object.create === 'function') {
            const sym = Object.create(null);
            sym.toString = function () {
              return key;
            };
            sym.valueOf = function () {
              return key;
            };
            return sym;
          }

          // Fallback for very old environments
          return key;
        };

  // Implement Symbol.for
  SymbolPolyfill.for = function (key) {
    const stringKey = String(key);

    // Return existing symbol if it exists
    if (globalSymbolRegistry.hasOwnProperty(stringKey)) {
      return globalSymbolRegistry[stringKey];
    }

    // Create new symbol and register it
    const symbol = SymbolPolyfill(stringKey);
    globalSymbolRegistry[stringKey] = symbol;

    // Store reverse mapping for keyFor
    if (typeof symbol === 'object' && symbol !== null) {
      symbol.__key__ = stringKey;
    }

    return symbol;
  };

  // Implement Symbol.keyFor
  SymbolPolyfill.keyFor = function (sym) {
    // Check if it's a registered symbol
    for (const key in globalSymbolRegistry) {
      if (globalSymbolRegistry[key] === sym) {
        return key;
      }
    }

    // Check for __key__ property (for object-based symbols)
    if (typeof sym === 'object' && sym !== null && sym.__key__) {
      return sym.__key__;
    }

    // Not a registered symbol
    return undefined;
  };

  // Add well-known symbols that React and other libraries expect
  const wellKnownSymbols = [
    'iterator',
    'asyncIterator',
    'match',
    'matchAll',
    'replace',
    'search',
    'split',
    'hasInstance',
    'isConcatSpreadable',
    'unscopables',
    'species',
    'toPrimitive',
    'toStringTag',
  ];

  wellKnownSymbols.forEach(name => {
    if (!SymbolPolyfill[name]) {
      SymbolPolyfill[name] = SymbolPolyfill('Symbol.' + name);
    }
  });

  // Special handling for iterator
  if (!SymbolPolyfill.iterator) {
    SymbolPolyfill.iterator = SymbolPolyfill('Symbol.iterator');
  }

  // Make Symbol globally available
  if (typeof globalThis !== 'undefined') {
    globalThis.Symbol = SymbolPolyfill;
  }
  if (typeof window !== 'undefined') {
    window.Symbol = SymbolPolyfill;
  }
  if (typeof self !== 'undefined') {
    self.Symbol = SymbolPolyfill;
  }
  if (typeof global !== 'undefined') {
    global.Symbol = SymbolPolyfill;
  }

  // Also create numbered variations that bundlers might create
  for (let i = 1; i <= 10; i++) {
    const varName = 'Symbol$' + i;
    if (typeof globalThis !== 'undefined') {
      globalThis[varName] = SymbolPolyfill;
    }
    if (typeof window !== 'undefined') {
      window[varName] = SymbolPolyfill;
    }
  }

  console.log('[Symbol Polyfill] ✅ Symbol polyfill installed successfully');
  console.log('[Symbol Polyfill] Symbol.for available:', typeof SymbolPolyfill.for === 'function');
  console.log('[Symbol Polyfill] Symbol.keyFor available:', typeof SymbolPolyfill.keyFor === 'function');
})();