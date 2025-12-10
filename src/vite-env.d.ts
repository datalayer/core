/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly EXAMPLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.lexical' {
  const content: any;
  export default content;
}
