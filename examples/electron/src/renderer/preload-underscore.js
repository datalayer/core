/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Pre-load lodash as underscore for Backbone compatibility
// This file is imported before anything else to ensure _ is available
import * as lodash from 'lodash';
import * as Backbone from 'backbone';

// Make lodash available globally as underscore
window._ = lodash;
window.lodash = lodash;

// Also make Backbone available globally for widgets
window.Backbone = Backbone;

// Export for use by other modules
export { lodash, Backbone };
export default lodash;

console.log('[Preload] Lodash and Backbone loaded');
