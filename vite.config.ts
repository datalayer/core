/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { treatAsCommonjs } from "vite-plugin-treat-umd-as-commonjs";

// https://vite.dev/config/
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    react(),
    treatAsCommonjs(),
    {
      name: "raw-css-as-string",
      enforce: "pre",
      async resolveId(source, importer) {
        if (source.endsWith(".raw.css") && !source.includes("?raw")) {
          // rewrite import to append ?raw query
          const resolved = await this.resolve(source + "?raw", importer, {
            skipSelf: true,
          });
          if (resolved) return resolved.id;
          return null;
        }
        return null;
      },
    },
    {
      name: "fix-text-query",
      enforce: "pre",
      async resolveId(source, importer) {
        if (source.includes("?text")) {
          const fixed = source.replace("?text", "?raw");
          const resolved = await this.resolve(fixed, importer, {
            skipSelf: true,
          });
          if (resolved) {
            return resolved.id;
          }
          return fixed;
        }
        return null;
      },
    },
  ],
  define: {
    global: "globalThis",
    __webpack_public_path__: '""',
  },
  assetsInclude: ["**/*.whl", "**/*.raw.css"],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (/pypi\//.test(assetInfo.names[0])) {
            return "pypi/[name][extname]";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^~(.*)$/,
        replacement: "$1",
      },
      {
        find: "crypto",
        replacement: "crypto-browserify",
      },
      {
        find: "buffer",
        replacement: "buffer",
      },
    ],
  },
  optimizeDeps: {
    include: ["crypto-browserify", "buffer"],
    esbuildOptions: {
      loader: {
        ".whl": "text",
      },
    },
  },
  test: {
    coverage: {
      include: ["src/**/*"],
      exclude: [
        "src/**/*.{test,spec}.{js,ts,tsx}",
        "src/test-setup.ts",
        "src/stories/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
    server: {
      deps: {
        external: ["@datalayer/jupyter-react", "@jupyter/web-components"],
      },
    },
    projects: [
      // Unit tests
      {
        test: {
          name: "unit",
          include: ["src/**/*.{test,spec}.{js,ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["src/test-setup.ts"],
        },
      },
      // Storybook tests
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
