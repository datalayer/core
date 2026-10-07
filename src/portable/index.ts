/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What any JavaScript runtime can import from Core: plain functions and
 * types, no React, DOM, Jupyter or Node built-in. The mobile app reaches
 * Core only through `@datalayer/core/lib/portable`.
 *
 * @module portable
 */

export { personOf, type Person } from './person';
