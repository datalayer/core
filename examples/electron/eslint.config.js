/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Electron example specific ESLint config - more permissive for debugging
// Using an async function to import ES modules in CommonJS context
module.exports = (async () => {
  const parentConfig = await import('../../eslint.config.js');

  return [
    ...(parentConfig.default || parentConfig),
    {
      files: ['src/**/*.{ts,tsx,js,jsx}'],
      rules: {
        // Allow console.log for debugging in Electron example
        'no-console': 'off',

        // More permissive rules for example code
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',

        // Allow unescaped entities in JSX for example content
        'react/no-unescaped-entities': 'off',

        // Relax React hook dependency warnings for complex example code
        'react-hooks/exhaustive-deps': 'off',

        // Keep prettier warnings but don't fail builds
        'prettier/prettier': 'warn',
      },
    },
  ];
})();
