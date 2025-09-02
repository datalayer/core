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

// ListCache implementation (lodash internal data structure)
function ListCache(entries) {
  let index = -1,
    length = entries == null ? 0 : entries.length;

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
  let data = this.__data__,
    index = -1,
    length = data.length;

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
  let data = this.__data__,
    index = -1,
    length = data.length;

  while (++index < length) {
    if (data[index][0] === key) {
      return data[index][1];
    }
  }
  return undefined;
};

ListCache.prototype.has = function (key) {
  let data = this.__data__,
    index = -1,
    length = data.length;

  while (++index < length) {
    if (data[index][0] === key) {
      return true;
    }
  }
  return false;
};

ListCache.prototype.set = function (key, value) {
  let data = this.__data__,
    index = -1,
    length = data.length;

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
  let index = -1,
    length = entries == null ? 0 : entries.length;

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
  let index = -1,
    length = entries == null ? 0 : entries.length;

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

console.log('[Lodash Polyfills] Applied successfully');
