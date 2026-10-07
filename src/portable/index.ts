/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What any JavaScript runtime can import from Core: no React, DOM, Jupyter or
 * Node built-in. Re-exports only; the mobile app reaches Core through this
 * entry alone.
 *
 * @module portable
 */

export { personOf, type Person } from '../models/Person';
