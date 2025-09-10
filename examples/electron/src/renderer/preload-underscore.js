/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Pre-load lodash as underscore for Backbone compatibility
// This file is imported before anything else to ensure _ is available
import * as lodash from 'lodash';
import * as Backbone from 'backbone';

// CRITICAL: Define bulletproof extend function IMMEDIATELY
function bulletproofExtend(object, ...sources) {
  const target = object && typeof object === 'object' ? object : {};
  sources.forEach(source => {
    if (source != null && typeof source === 'object') {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          const finalKey = key === 'class-name' ? 'className' : key;
          target[finalKey] = source[key];
        }
      }
    }
  });
  return target;
}

// Make lodash available globally as underscore
window._ = lodash;
window.lodash = lodash;

// CRITICAL: Override extend functions IMMEDIATELY with bulletproof version
// Use try-catch to handle non-extensible objects in production
try {
  window._.extend = bulletproofExtend;
} catch (e) {
  if (
    e.message.includes('not extensible') ||
    e.message.includes('Cannot add property')
  ) {
    console.warn(
      '[Preload] Could not override window._.extend - object not extensible'
    );
  } else {
    throw e;
  }
}

try {
  window.lodash.extend = bulletproofExtend;
} catch (e) {
  if (
    e.message.includes('not extensible') ||
    e.message.includes('Cannot add property')
  ) {
    console.warn(
      '[Preload] Could not override window.lodash.extend - object not extensible'
    );
  } else {
    throw e;
  }
}

// Also make Backbone available globally for widgets
window.Backbone = Backbone;

// Basic theme compatibility - rely on lodash-polyfills.js and Vite config for heavy lifting
(function () {
  console.log(
    '[Preload Theme Patch] Loading basic underscore/lodash availability'
  );

  // The real work is done by:
  // 1. lodash-polyfills.js - provides safe extend function for all numbered variations
  // 2. Vite config fix-lodash-bundling - injects polyfills into bundle
  // 3. Vite config fix-jupyter-theme-class-name - transforms class-name at build time

  console.log(
    '[Preload Theme Patch] Basic setup complete - relying on comprehensive polyfills'
  );
})();

// Export for use by other modules
export { lodash, Backbone };
export default lodash;

console.log('[Preload] Lodash and Backbone loaded');
