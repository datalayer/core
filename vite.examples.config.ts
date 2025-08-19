/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { treatAsCommonjs } from "vite-plugin-treat-umd-as-commonjs";
import path from "node:path";
import fs from "fs";

// Select which example to run by uncommenting the desired line
const EXAMPLE =
  // 'CellExample';
  "DatalayerNotebookExample";
// 'NotebookExample';
// 'NotebookMutationsKernel';
// 'NotebookMutationsServiceManager';

// Allow override via environment variable
const SELECTED_EXAMPLE = process.env.EXAMPLE || EXAMPLE;

console.log(`🚀 Running example: ${SELECTED_EXAMPLE}`);

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    root: process.cwd(),
    publicDir: false,

    server: {
      port: 3000,
      open: true,
      fs: {
        strict: false,
      },
      proxy: {
        "/api": {
          target: "https://prod1.datalayer.run",
          changeOrigin: true,
          secure: true,
          configure: (proxy, options) => {
            proxy.on("proxyReq", (proxyReq, req, res) => {
              console.log(
                "Proxying:",
                req.method,
                req.url,
                "->",
                options.target + req.url,
              );
            });
          },
        },
      },
    },

    plugins: [
      react(),
      treatAsCommonjs(),
      {
        name: "html-transform",
        transformIndexHtml(html) {
          // Replace environment variables in HTML
          return html.replace(
            /%VITE_DATALAYER_API_TOKEN%/g,
            env.VITE_DATALAYER_API_TOKEN || "",
          );
        },
      },
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
      "process.env.EXAMPLE": JSON.stringify(SELECTED_EXAMPLE),
    },

    assetsInclude: ["**/*.whl", "**/*.raw.css"],

    resolve: {
      alias: [
        {
          find: /^~(.*)$/,
          replacement: "$1",
        },
        {
          find: "crypto",
          replacement: path.resolve(
            __dirname,
            "node_modules/crypto-browserify",
          ),
        },
        {
          find: "buffer",
          replacement: path.resolve(__dirname, "node_modules/buffer"),
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

    build: {
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
      },
    },
  };
});
