#!/usr/bin/env node

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Post-build script to fix temporal dead zone issues in production bundles
 * This script automatically injects polyfills at the beginning of the main bundle
 * and ensures Symbol.for is available for React
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

console.log('🔧 Starting post-build bundle fixes...');

// Critical polyfills that must execute before any bundle code
const CRITICAL_POLYFILLS = `// CRITICAL POLYFILLS - Execute synchronously at bundle start

// SUPER SIMPLE SYMBOL POLYFILL - Just ensure Symbol.for exists
if (typeof Symbol === 'undefined') {
  globalThis.Symbol = function Symbol(description) {
    return '@@Symbol(' + (description || '') + ')_' + Math.random();
  };
}

// Ensure Symbol.for exists
if (!Symbol.for) {
  var globalSymbolRegistry = {};
  Symbol.for = function(key) {
    var stringKey = String(key);
    if (!globalSymbolRegistry[stringKey]) {
      globalSymbolRegistry[stringKey] = Symbol(stringKey);
    }
    return globalSymbolRegistry[stringKey];
  };
}

// Ensure Symbol.keyFor exists
if (!Symbol.keyFor) {
  Symbol.keyFor = function(symValue) {
    for (var key in globalSymbolRegistry) {
      if (globalSymbolRegistry[key] === symValue) {
        return key;
      }
    }
    return undefined;
  };
}

// Add well-known symbols if missing
if (!Symbol.iterator) Symbol.iterator = Symbol('Symbol.iterator');
if (!Symbol.toStringTag) Symbol.toStringTag = Symbol('Symbol.toStringTag');

console.log('[Symbol Polyfill] Symbol:', typeof Symbol);
console.log('[Symbol Polyfill] Symbol.for:', typeof Symbol.for);
console.log('[Symbol Polyfill] Testing Symbol.for:', Symbol.for('test'));

// Lodash polyfills
var base$1 = function(object, source) { return object && source; };
var base$2 = base$1;
var base$3 = base$1;
var base$4 = base$1;
var base$5 = base$1;
var base$6 = base$1;
var base$7 = base$1;
var base$8 = base$1;
var base$9 = base$1;
var base$10 = base$1;

var defineProperty$1 = function(obj, key, descriptor) {
  if (obj && typeof obj === 'object' && key != null) {
    try {
      return Object.defineProperty(obj, key, descriptor);
    } catch (e) {
      if (descriptor && descriptor.hasOwnProperty('value')) {
        obj[key] = descriptor.value;
      }
      return obj;
    }
  }
  return obj;
};

var defineProperty$2 = defineProperty$1;
var defineProperty$3 = defineProperty$1;
var defineProperty$4 = defineProperty$1;
var defineProperty$5 = defineProperty$1;
var defineProperty$6 = defineProperty$1;
var defineProperty$7 = defineProperty$1;
var defineProperty$8 = defineProperty$1;
var defineProperty$9 = defineProperty$1;
var defineProperty$10 = defineProperty$1;

var baseGetTag$1 = function(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return Object.prototype.toString.call(value);
};

var baseGetTag$2 = baseGetTag$1;
var baseGetTag$3 = baseGetTag$1;
var baseGetTag$4 = baseGetTag$1;
var baseGetTag$5 = baseGetTag$1;
var baseGetTag$6 = baseGetTag$1;
var baseGetTag$7 = baseGetTag$1;
var baseGetTag$8 = baseGetTag$1;
var baseGetTag$9 = baseGetTag$1;
var baseGetTag$10 = baseGetTag$1;

var baseSetToString$1 = function(func, string) {
  return defineProperty$1(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': function() { return string; },
    'writable': true
  });
};

var baseSetToString$2 = baseSetToString$1;
var baseSetToString$3 = baseSetToString$1;
var baseSetToString$4 = baseSetToString$1;
var baseSetToString$5 = baseSetToString$1;

var baseRest$1 = function(func, start) {
  return function() {
    var args = Array.prototype.slice.call(arguments, start || 0);
    return func.apply(this, args);
  };
};

var baseRest$2 = baseRest$1;
var baseRest$3 = baseRest$1;
var baseRest$4 = baseRest$1;
var baseRest$5 = baseRest$1;

var createAssigner$1 = function(assigner) {
  return function(object) {
    var sources = Array.prototype.slice.call(arguments, 1);
    sources.forEach(function(source) {
      if (source) {
        assigner(object, source);
      }
    });
    return object;
  };
};

var createAssigner$2 = createAssigner$1;
var createAssigner$3 = createAssigner$1;
var createAssigner$4 = createAssigner$1;
var createAssigner$5 = createAssigner$1;

`;

async function fixBundle() {
  try {
    // Find the main bundle (largest JS file)
    const distPath = path.join(__dirname, '..', 'dist', 'renderer', 'assets');
    const jsFiles = await glob('index-*.js', { cwd: distPath });

    if (jsFiles.length === 0) {
      console.log('❌ No bundle files found');
      return false;
    }

    // Find the largest bundle
    let largestFile = null;
    let largestSize = 0;

    for (const file of jsFiles) {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      if (stats.size > largestSize) {
        largestSize = stats.size;
        largestFile = file;
      }
    }

    if (!largestFile || largestSize < 1000000) {
      console.log('❌ No large bundle found to fix');
      return false;
    }

    const bundlePath = path.join(distPath, largestFile);
    console.log(
      `🎯 Fixing bundle: ${largestFile} (${Math.round(largestSize / 1024)}kb)`
    );

    let content = fs.readFileSync(bundlePath, 'utf8');

    // Step 1: Check if Symbol polyfill is already injected by Vite
    if (content.includes('[Vite Symbol] Injected at bundle start')) {
      console.log('✅ Symbol polyfill already injected by Vite plugin');
    } else if (!content.startsWith('// CRITICAL POLYFILLS')) {
      // Only inject if not already present
      content = CRITICAL_POLYFILLS + '\n' + content;
      console.log('✅ Injected critical polyfills at bundle start');
    }

    // Step 2: Fix React's Symbol.for calls in async context
    // React's minified code uses Symbol.for but Symbol is undefined in async scope
    // Replace all Symbol.for calls with a safe version that uses the global Symbol

    // First, ensure global Symbol is available in async scope
    const asyncStartPattern =
      /let __tla = Promise\.all\(\[[\s\S]*?\]\)\.then\(async \(\)=>{/;
    content = content.replace(asyncStartPattern, match => {
      return (
        match +
        '\n    // Ensure Symbol is available in async scope\n    if (typeof Symbol === "undefined") { var Symbol = globalThis.Symbol || window.Symbol; }\n'
      );
    });

    console.log('✅ Added Symbol reference to async scope');

    // Step 3: Rename conflicting widget base$1 to widgetBase$1
    const originalContent = content;

    // Find const base$1 = Object.freeze(Object.defineProperty({
    content = content.replace(
      /const base\$1 = Object\.freeze\(Object\.defineProperty\({/g,
      'const widgetBase$1 = Object.freeze(Object.defineProperty({'
    );

    // Update references to widget exports
    content = content.replace(
      /window\.define\('@jupyter-widgets\/base', base\$1\);/g,
      "window.define('@jupyter-widgets/base', widgetBase$1);"
    );

    content = content.replace(
      /__vitePreload\(\(\)=>Promise\.resolve\(\)\.then\(\(\)=>base\$1\)/g,
      '__vitePreload(()=>Promise.resolve().then(()=>widgetBase$1)'
    );

    content = content.replace(/resolve\(base\$1\);/g, 'resolve(widgetBase$1);');

    if (content !== originalContent) {
      console.log('✅ Renamed conflicting widget base$1 to widgetBase$1');
    }

    // Write the fixed bundle
    fs.writeFileSync(bundlePath, content, 'utf8');
    console.log('🎉 Bundle fixes applied successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error fixing bundle:', error);
    return false;
  }
}

// Run the fix
fixBundle().then(success => {
  if (success) {
    console.log('✅ Post-build bundle fixes completed');
    process.exit(0);
  } else {
    console.log('❌ Post-build bundle fixes failed');
    process.exit(1);
  }
});
