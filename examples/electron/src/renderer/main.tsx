/**
 * @module renderer/main
 * @description Main entry point for the Electron renderer process.
 * Handles polyfills, Prism.js configuration, and React application initialization.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Load all polyfills in the correct order.
 * This single import handles Symbol, lodash, Node.js builtins, RequireJS, etc.
 */
import './polyfills';

/**
 * Import Prism for syntax highlighting and make it globally available.
 */
import Prism from 'prismjs';

/**
 * Import common language components for Prism.js.
 */
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';

/**
 * Make Prism available globally for Lexical code highlighting.
 */
(window as any).Prism = Prism;

/**
 * Ensure all Prism instances have the 'c' language to prevent extension errors.
 * This must run after Prism is loaded but before any extensions load.
 * @internal
 */
function ensureCLanguageInAllPrismInstances() {
  const cLanguageDefinition = {
    comment: [
      {
        pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
        lookbehind: true,
        greedy: true,
      },
      {
        pattern: /(^|[^\\:])\/\/.*/,
        lookbehind: true,
        greedy: true,
      },
    ],
    string: {
      pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
      greedy: true,
    },
    'class-name': {
      pattern:
        /(\b(?:enum|struct)\s+(?:__attribute__\s*\(\([^\s\S]*?\)\)\s*)?)\w+|\b[a-z]\w*_t\b/,
      lookbehind: true,
    },
    keyword:
      /\b(?:__attribute__|_Alignas|_Alignof|_Atomic|_Static_assert|_Noreturn|_Thread_local|_Generic|asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/,
    function: /\b[a-z_]\w*(?=\s*\()/i,
    number:
      /(?:\b0x(?:[\da-f]+(?:\.[\da-f]*)?|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?)[ful]{0,4}/i,
    operator: />>=?|<<=?|->|([-+&|:])\\1|[?:~]|[-+*/%&|^!=<>]=?/,
    boolean: /\b(?:false|true)\b/,
    punctuation: /[{}[\];(),.:]/,
  };

  // Ensuring C language exists in all Prism instances

  // Fix the global Prism instance (if exists)
  if (typeof window !== 'undefined' && (window as any).Prism?.languages) {
    if (!(window as any).Prism.languages.c) {
      // Adding C language to global Prism instance
      (window as any).Prism.languages.c = cLanguageDefinition;
    }
  }

  // Set up interval to ensure bundled Prism instances also have the C language
  let checkCount = 0;
  const maxChecks = 50;

  const ensureInterval = setInterval(() => {
    checkCount++;
    let foundAndFixed = 0;

    // Check all global variables that might be Prism instances
    for (const key in window) {
      try {
        const obj = (window as any)[key];
        if (
          obj &&
          typeof obj === 'object' &&
          obj.languages &&
          obj.util &&
          typeof obj.highlight === 'function'
        ) {
          if (!obj.languages.c) {
            // Found Prism instance, adding C language
            obj.languages.c = cLanguageDefinition;
            foundAndFixed++;
          }
        }
      } catch (e) {
        // Skip if we can't access the property
      }
    }

    // Prism instance check completed

    if (checkCount >= maxChecks) {
      // Completed maximum checks for Prism instances
      clearInterval(ensureInterval);
    }
  }, 100); // Check every 100ms
}

/**
 * Run the fix after a short delay to ensure Prism is fully loaded.
 */
setTimeout(ensureCLanguageInAllPrismInstances, 500);

/**
 * Add missing Prism.js 'c' language definition.
 * This prevents "Cannot set properties of undefined (setting 'className')" error
 * when prism-cpp.js tries to extend the 'c' language.
 */
if (Prism && Prism.languages) {
  // Available Prism languages loaded

  if (!Prism.languages.c) {
    // Adding missing "c" language definition

    // Create a base C language definition without extending anything
    Prism.languages.c = {
      comment: [
        {
          pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
          lookbehind: true,
          greedy: true,
        },
        {
          pattern: /(^|[^\\:])\/\/.*/,
          lookbehind: true,
          greedy: true,
        },
      ],
      string: {
        pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
        greedy: true,
      },
      'class-name': {
        pattern:
          /(\b(?:enum|struct)\s+(?:__attribute__\s*\(\([\s\S]*?\)\)\s*)?)\w+|\b[a-z]\w*_t\b/,
        lookbehind: true,
      },
      keyword:
        /\b(?:__attribute__|_Alignas|_Alignof|_Atomic|_Static_assert|_Noreturn|_Thread_local|_Generic|asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/,
      function: /\b[a-z_]\w*(?=\s*\()/i,
      number:
        /(?:\b0x(?:[\da-f]+(?:\.[\da-f]*)?|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?)[ful]{0,4}/i,
      operator: />>=?|<<=?|->|([-+&|:])\1|[?:~]|[-+*/%&|^!=<>]=?/,
      boolean: /\b(?:false|true)\b/,
      punctuation: /[{}[\];(),.:]/,
    };

    // C language definition created successfully
  } else {
    // C language already exists
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Note: Electron APIs are only available when running in Electron environment.
 * In browser mode, the app will show "Not in Electron environment" message.
 */

/**
 * NOTE: We do NOT call loadJupyterConfig() globally here because DocumentEditor
 * needs to manage its own Jupyter configuration per runtime using ServiceManager props.
 */

/**
 * Get Datalayer configuration from environment.
 * Loads configuration from Electron environment variables.
 * @returns Promise that resolves when configuration is loaded
 */
const loadDatalayerConfig = async () => {
  if (window.electronAPI) {
    const env = await window.electronAPI.getEnv();
    if (env.DATALAYER_RUN_URL && env.DATALAYER_TOKEN) {
      /** Store in window for now (in production, use proper state management) */
      (window as any).datalayerConfig = {
        runUrl: env.DATALAYER_RUN_URL,
        token: env.DATALAYER_TOKEN,
      };
    }
  }
};

/**
 * Initialize and render the React application.
 * Loads configuration and mounts the app to the DOM.
 * @returns Promise that resolves when app is initialized
 */
const init = async () => {
  await loadDatalayerConfig();

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

/**
 * Start the application initialization process.
 */
init();
