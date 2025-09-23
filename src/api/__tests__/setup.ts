/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Test environment setup
 */

// Polyfill AbortController for test environment
import AbortController from 'abort-controller';

if (typeof globalThis.AbortController === 'undefined') {
  globalThis.AbortController = AbortController as any;
}

if (typeof globalThis.AbortSignal === 'undefined') {
  globalThis.AbortSignal = (AbortController as any).AbortSignal;
}
