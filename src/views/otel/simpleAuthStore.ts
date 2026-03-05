/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Minimal token-based authentication store.
 *
 * Persists a JWT bearer token and a user handle to localStorage so the
 * session survives page refreshes.  Intended for demo / example apps that
 * need a lightweight auth layer without a full IAM integration.
 *
 * Import via the `@datalayer/core/views/otel` subpath:
 *   import { useSimpleAuthStore } from '@datalayer/core/views/otel';
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SimpleAuthState {
  /** JWT bearer token (from IAM login). */
  token: string | null;
  /** Authenticated user's handle. */
  handle: string | null;
  /** Set credentials after successful login. */
  setAuth: (token: string, handle: string) => void;
  /** Clear credentials (logout). */
  clearAuth: () => void;
}

export const useSimpleAuthStore = create<SimpleAuthState>()(
  persist(
    (set) => ({
      token: null,
      handle: null,
      setAuth: (token, handle) => set({ token, handle }),
      clearAuth: () => set({ token: null, handle: null }),
    }),
    { name: 'datalayer-simple-auth' },
  ),
);
