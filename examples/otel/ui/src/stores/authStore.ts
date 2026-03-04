/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Authentication store for the OTEL example.
 *
 * Persists token + user handle to localStorage so the session
 * survives page refreshes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
  /** JWT bearer token (from IAM login). */
  token: string | null;
  /** Authenticated user's handle. */
  handle: string | null;
  /** Set credentials after successful login. */
  setAuth: (token: string, handle: string) => void;
  /** Clear credentials (logout). */
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      handle: null,
      setAuth: (token, handle) => set({ token, handle }),
      clearAuth: () => set({ token: null, handle: null }),
    }),
    { name: 'otel-example-auth' },
  ),
);
