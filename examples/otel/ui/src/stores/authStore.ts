/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// The auth store now lives in @datalayer/core/views/otel.
// Re-export it here under the legacy names for backwards-compat.
export { useSimpleAuthStore as useAuthStore } from '@datalayer/core/views/otel';
export type { SimpleAuthState as AuthState } from '@datalayer/core/views/otel';
