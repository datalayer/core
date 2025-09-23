/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/iam
 * @description IAM (Identity and Access Management) API exports.
 *
 * Provides organized access to authentication and user profile functionality.
 */

export * as authentication from './authentication';
export * as profile from './profile';

// For backward compatibility, export the old API structure
export { login, logout, proxyAuth } from './authentication';
export { me, whoami } from './profile';
