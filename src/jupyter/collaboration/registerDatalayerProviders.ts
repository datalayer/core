/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { collaborationProviderRegistry } from '@datalayer/jupyter-react';
import { DatalayerCollaborationProvider } from './DatalayerCollaborationProvider';

/**
 * Register Datalayer-specific collaboration providers.
 * This should be called during Datalayer core initialization.
 */
export function registerDatalayerCollaborationProviders(): void {
  // Register the Datalayer collaboration provider
  collaborationProviderRegistry.register('datalayer', new DatalayerCollaborationProvider());
}

// Auto-register Datalayer providers when this module is imported
registerDatalayerCollaborationProviders();