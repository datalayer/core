/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { IJupyterCollaborationServer } from '@datalayer/jupyter-react';

/**
 * Datalayer-specific collaboration server configuration
 */
export type IDatalayerCollaborationServer = {
  /**
   * Base server URL
   */
  baseURL: string;
  /**
   * Notebook document name to connect to.
   */
  documentName: string;
  /**
   * JWT token
   */
  token: string;
  /**
   * Server type
   */
  type: 'datalayer';
}

/**
 * Extended collaboration server type that includes both Jupyter and Datalayer options
 * This is used in the core package to support both collaboration types
 */
export type ICoreCollaborationServer = IJupyterCollaborationServer | IDatalayerCollaborationServer;

// Note: ICollaborationProvider is now generic (string | undefined) in jupyter-ui
// Extensions can use any provider name without type overrides