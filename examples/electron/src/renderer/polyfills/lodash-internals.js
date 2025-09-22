/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Lodash polyfills to fix bundling issues with Map/Set constructors
 * This must be loaded before any lodash code executes
 */

// Save native constructors
const NativeMap = globalThis.Map;
const NativeSet = globalThis.Set;
const NativeWeakMap = globalThis.WeakMap;
const NativeWeakSet = globalThis.WeakSet;
const NativeDataView = globalThis.DataView;
const NativePromise = globalThis.Promise;
const NativeSymbol = globalThis.Symbol;
const NativeUint8Array = globalThis.Uint8Array;

// Ensure Symbol.for is available
if (NativeSymbol && !NativeSymbol.for) {
  NativeSymbol.for = function (key) {
    return NativeSymbol(String(key));
  };
}

// Ensure Symbol.keyFor is available
if (NativeSymbol && !NativeSymbol.keyFor) {
  NativeSymbol.keyFor = function (sym) {
    return undefined;
  };
}

// ListCache implementation (lodash internal data structure)
function ListCache(entries) {
  let index = -1;
  const length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    const entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

ListCache.prototype.clear = function () {
  this.__data__ = [];
  this.size = 0;
};

ListCache.prototype['delete'] = function (key) {
  const data = this.__data__;
  let index = -1;
  const length = data.length;

  while (++index < length) {
    if (data[index][0] === key) {
      const lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        data.splice(index, 1);
      }
      --this.size;
      return true;
    }
  }
  return false;
};

ListCache.prototype.get = function (key) {
  const data = this.__data__;
  let index = -1;
  const length = data.length;

  while (++index < length) {
    if (data[index][0] === key) {
      return data[index][1];
    }
  }
  return undefined;
};

ListCache.prototype.has = function (key) {
  const data = this.__data__;
  let index = -1;
  const length = data.length;

  while (++index < length) {
    if (data[index][0] === key) {
      return true;
    }
  }
  return false;
};

ListCache.prototype.set = function (key, value) {
  const data = this.__data__;
  let index = -1;
  const length = data.length;

  while (++index < length) {
    if (data[index][0] === key) {
      data[index][1] = value;
      return this;
    }
  }
  ++this.size;
  data.push([key, value]);
  return this;
};

// Make ListCache available globally for all variations
globalThis.ListCache = ListCache;
globalThis.ListCache$1 = ListCache;
globalThis.ListCache$2 = ListCache;
globalThis.ListCache$3 = ListCache;
globalThis.ListCache$4 = ListCache;

// Make native constructors available for all variations
globalThis.Map$1 = NativeMap;
globalThis.Map$2 = NativeMap;
globalThis.Map$3 = NativeMap;
globalThis.Map$4 = NativeMap;
globalThis.Map$5 = NativeMap;
globalThis.Map$6 = NativeMap;

globalThis.Set$1 = NativeSet;
globalThis.Set$2 = NativeSet;
globalThis.Set$3 = NativeSet;
globalThis.Set$4 = NativeSet;
globalThis.Set$5 = NativeSet;
globalThis.Set$6 = NativeSet;

globalThis.WeakMap$1 = NativeWeakMap;
globalThis.WeakMap$2 = NativeWeakMap;
globalThis.WeakMap$3 = NativeWeakMap;
globalThis.WeakMap$4 = NativeWeakMap;

globalThis.WeakSet$1 = NativeWeakSet;
globalThis.WeakSet$2 = NativeWeakSet;
globalThis.WeakSet$3 = NativeWeakSet;
globalThis.WeakSet$4 = NativeWeakSet;

globalThis.DataView$1 = NativeDataView;
globalThis.DataView$2 = NativeDataView;
globalThis.DataView$3 = NativeDataView;
globalThis.DataView$4 = NativeDataView;

globalThis.Promise$1 = NativePromise;
globalThis.Promise$2 = NativePromise;
globalThis.Promise$3 = NativePromise;
globalThis.Promise$4 = NativePromise;

globalThis.Symbol$1 = NativeSymbol;
globalThis.Symbol$2 = NativeSymbol;
globalThis.Symbol$3 = NativeSymbol;
globalThis.Symbol$4 = NativeSymbol;
globalThis.Symbol$5 = NativeSymbol;
globalThis.Symbol$6 = NativeSymbol;

globalThis.Uint8Array$1 = NativeUint8Array;
globalThis.Uint8Array$2 = NativeUint8Array;
globalThis.Uint8Array$3 = NativeUint8Array;
globalThis.Uint8Array$4 = NativeUint8Array;
globalThis.Uint8Array$5 = NativeUint8Array;
globalThis.Uint8Array$6 = NativeUint8Array;

// MapCache implementation that uses Map or ListCache
function MapCache(entries) {
  let index = -1;
  const length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    const entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

MapCache.prototype.clear = function () {
  this.size = 0;
  this.__data__ = {
    hash: new Hash(),
    map: new (NativeMap || ListCache)(),
    string: new Hash(),
  };
};

MapCache.prototype['delete'] = function (key) {
  const result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
};

MapCache.prototype.get = function (key) {
  return getMapData(this, key).get(key);
};

MapCache.prototype.has = function (key) {
  return getMapData(this, key).has(key);
};

MapCache.prototype.set = function (key, value) {
  const data = getMapData(this, key),
    size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
};

// Hash implementation (simplified)
function Hash(entries) {
  let index = -1;
  const length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    const entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

Hash.prototype.clear = function () {
  this.__data__ = Object.create(null);
  this.size = 0;
};

Hash.prototype['delete'] = function (key) {
  const result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
};

Hash.prototype.get = function (key) {
  const data = this.__data__;
  const result = data[key];
  return result === '__lodash_hash_undefined__' ? undefined : result;
};

Hash.prototype.has = function (key) {
  const data = this.__data__;
  return data[key] !== undefined;
};

Hash.prototype.set = function (key, value) {
  const data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = value === undefined ? '__lodash_hash_undefined__' : value;
  return this;
};

// Helper function to get the appropriate storage mechanism
function getMapData(map, key) {
  const data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

// Helper function to check if a value can be used as a key
function isKeyable(value) {
  const type = typeof value;
  return type == 'string' ||
    type == 'number' ||
    type == 'symbol' ||
    type == 'boolean'
    ? value !== '__proto__'
    : value === null;
}

// Make MapCache available globally
globalThis.MapCache = MapCache;
globalThis.MapCache$1 = MapCache;
globalThis.MapCache$2 = MapCache;
globalThis.MapCache$3 = MapCache;
globalThis.MapCache$4 = MapCache;

// Stack implementation
function Stack(entries) {
  const data = (this.__data__ = new ListCache(entries));
  this.size = data.size;
}

Stack.prototype.clear = function () {
  this.__data__ = new ListCache();
  this.size = 0;
};

Stack.prototype['delete'] = function (key) {
  const data = this.__data__,
    result = data['delete'](key);

  this.size = data.size;
  return result;
};

Stack.prototype.get = function (key) {
  return this.__data__.get(key);
};

Stack.prototype.has = function (key) {
  return this.__data__.has(key);
};

Stack.prototype.set = function (key, value) {
  let data = this.__data__;
  if (data instanceof ListCache) {
    const pairs = data.__data__;
    if (!NativeMap || pairs.length < 200 - 1) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
};

// Make Stack available globally
globalThis.Stack = Stack;
globalThis.Stack$1 = Stack;
globalThis.Stack$2 = Stack;
globalThis.Stack$3 = Stack;
globalThis.Stack$4 = Stack;

// BaseGetTag function (lodash internal)
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return Object.prototype.toString.call(value);
}

// Make baseGetTag available globally for all variations
globalThis.baseGetTag = baseGetTag;
for (let i = 1; i <= 10; i++) {
  globalThis['baseGetTag$' + i] = baseGetTag;
}

// Base function (lodash internal)
function base(object, source) {
  return object && source;
}

// Make base available globally for all variations
globalThis.base = base;
for (let i = 1; i <= 10; i++) {
  globalThis['base$' + i] = base;
}

// CRITICAL: Safe extend function that handles undefined destination
function safeExtend(destination, ...sources) {
  // Handle undefined destination - CRITICAL FIX for theme errors
  let safeDestination = destination;
  if (!safeDestination || typeof safeDestination !== 'object') {
    safeDestination = {};
  }

  // Process sources to fix 'class-name' properties
  const processedSources = sources.map(source => {
    if (source && typeof source === 'object') {
      const processed = { ...source };

      // Fix 'class-name' -> 'className'
      if (
        processed.hasOwnProperty &&
        Object.prototype.hasOwnProperty.call(processed, 'class-name')
      ) {
        if (!Object.prototype.hasOwnProperty.call(processed, 'className')) {
          processed.className = processed['class-name'];
        }
        try {
          delete processed['class-name'];
        } catch (e) {
          // If can't delete, leave both
        }
      }

      return processed;
    }
    return source;
  });

  // Use Object.assign for safe merge
  processedSources.forEach(src => {
    if (src && typeof src === 'object') {
      Object.assign(safeDestination, src);
    }
  });

  return safeDestination;
}

// CRITICAL: Bulletproof extend function that handles ALL edge cases
function bulletproofExtend(object, ...sources) {
  console.log('[BulletproofExtend] Called with:', { object, sources });

  // Handle undefined/null/non-object destination - create safe target
  let target;
  if (object && typeof object === 'object') {
    target = object;
  } else {
    console.warn(
      '[BulletproofExtend] Target was undefined/null, creating new object:',
      object
    );
    target = {};
  }

  // Process each source
  sources.forEach((source, index) => {
    if (source != null && typeof source === 'object') {
      console.log(`[BulletproofExtend] Processing source ${index}:`, source);
      for (const key in source) {
        if (
          source.hasOwnProperty &&
          Object.prototype.hasOwnProperty.call(source, key)
        ) {
          // Fix 'class-name' -> 'className' during assignment
          const finalKey = key === 'class-name' ? 'className' : key;
          console.log(`[BulletproofExtend] Setting ${finalKey}:`, source[key]);
          target[finalKey] = source[key];
        }
      }
    } else {
      console.log(
        `[BulletproofExtend] Skipping invalid source ${index}:`,
        source
      );
    }
  });

  console.log('[BulletproofExtend] Result:', target);
  return target;
}

// CRITICAL: Remove Object.assign interception to avoid class inheritance conflicts
// The real fix needs to be in ensuring Prism languages are properly defined
console.log(
  '[Lodash Polyfills] Skipping Object.assign interception to avoid class conflicts'
);

// Make bulletproofExtend available for ALL numbered variations the bundler might create
globalThis.safeExtend = bulletproofExtend;
globalThis.extend = bulletproofExtend;

// Override ALL possible extend variations (following baseGetTag$ pattern)
for (let i = 1; i <= 10; i++) {
  globalThis['extend$' + i] = bulletproofExtend;
}

// CRITICAL: Override the actual lodash extend functions
if (window._) {
  window._.extend = bulletproofExtend;
}
if (window.lodash) {
  window.lodash.extend = bulletproofExtend;
}

// CRITICAL: Add comprehensive polyfills for ALL lodash internal functions
// that might have numbered variations in production builds

// defineProperty function (used by baseSetToString and others)
function defineProperty(obj, key, descriptor) {
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
}

globalThis.defineProperty = defineProperty;
for (let i = 1; i <= 10; i++) {
  globalThis['defineProperty$' + i] = defineProperty;
}

// baseSetToString function (lodash internal)
function baseSetToString(func, string) {
  return defineProperty(func, 'toString', {
    configurable: true,
    enumerable: false,
    value: function () {
      return string;
    },
    writable: true,
  });
}

globalThis.baseSetToString = baseSetToString;
for (let i = 1; i <= 10; i++) {
  globalThis['baseSetToString$' + i] = baseSetToString;
}

// baseRest function (lodash internal)
function baseRest(func, start) {
  return function () {
    const args = Array.prototype.slice.call(arguments, start || 0);
    return func.apply(this, args);
  };
}

globalThis.baseRest = baseRest;
for (let i = 1; i <= 10; i++) {
  globalThis['baseRest$' + i] = baseRest;
}

// createAssigner function (lodash internal)
function createAssigner(assigner) {
  return function (object) {
    const sources = Array.prototype.slice.call(arguments, 1);
    sources.forEach(function (source) {
      if (source) {
        assigner(object, source);
      }
    });
    return object;
  };
}

globalThis.createAssigner = createAssigner;
for (let i = 1; i <= 10; i++) {
  globalThis['createAssigner$' + i] = createAssigner;
}

// isObject function (lodash internal)
function isObject(value) {
  const type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

globalThis.isObject = isObject;
for (let i = 1; i <= 10; i++) {
  globalThis['isObject$' + i] = isObject;
}

// toSource function (lodash internal)
function toSource(func) {
  if (func != null) {
    try {
      return Function.prototype.toString.call(func);
    } catch (e) {
      // Ignore toString errors
    }
    try {
      return func + '';
    } catch (e) {
      // Ignore string conversion errors
    }
  }
  return '';
}

globalThis.toSource = toSource;
for (let i = 1; i <= 10; i++) {
  globalThis['toSource$' + i] = toSource;
}

// CRITICAL: Instead of patching Function.prototype.call (which causes infinite recursion),
// we'll patch Prism.languages.extend directly at runtime

// CRITICAL: Ensure Symbol.for is available globally
if (typeof globalThis !== 'undefined' && globalThis.Symbol) {
  if (!globalThis.Symbol.for) {
    globalThis.Symbol.for = function (key) {
      return NativeSymbol ? NativeSymbol(String(key)) : key;
    };
  }
  if (!globalThis.Symbol.keyFor) {
    globalThis.Symbol.keyFor = function (sym) {
      return undefined;
    };
  }
}

// Also ensure window.Symbol has these methods in browser environment
if (typeof window !== 'undefined' && window.Symbol) {
  if (!window.Symbol.for) {
    window.Symbol.for = function (key) {
      return NativeSymbol ? NativeSymbol(String(key)) : key;
    };
  }
  if (!window.Symbol.keyFor) {
    window.Symbol.keyFor = function (sym) {
      return undefined;
    };
  }
}

console.log(
  '[Lodash Polyfills] Applied successfully with comprehensive function polyfills'
);
