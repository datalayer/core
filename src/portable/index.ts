/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What any JavaScript runtime can import from Core: no React, DOM, Jupyter or
 * Node built-in. The mobile app reaches Core through this entry alone, and
 * its modules import nothing but each other and Core's pure models.
 *
 * @module portable
 */

export { personOf, type Person } from '../models/Person';

// Loading, empty and problem states, in a person's words (MOBILE M-013b).
export {
  detailOf,
  isProblem,
  kindOfStatus,
  Problem,
  PROBLEM_WORDS,
  problemOf,
  retries,
  STATE_WORDS,
  type ProblemKind,
} from './states';
