/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Lodash/Underscore Global Setup
 * Makes lodash available globally as _ and underscore for Backbone compatibility
 */

import * as lodash from 'lodash';
import * as Backbone from 'backbone';

// CRITICAL: Define bulletproof extend function
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
window.underscore = lodash;

// Override extend functions with bulletproof version
try {
  if (window._) {
    window._.extend = bulletproofExtend;
  }
  if (window.lodash) {
    window.lodash.extend = bulletproofExtend;
  }
} catch (e) {
  console.warn(
    '[Lodash Globals] Could not override extend functions:',
    e.message
  );
}

// Make Backbone available globally for widgets
window.Backbone = Backbone;

// Export for use by other modules
export { lodash, Backbone };
export default lodash;

console.log('[Lodash Globals] ✅ Lodash and Backbone loaded globally');
