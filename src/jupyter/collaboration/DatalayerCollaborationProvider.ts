/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';
import { ICollaborationProviderImpl, ICollaborationOptions } from '@datalayer/jupyter-react';
import { requestDatalayerollaborationSessionId } from './DatalayerCollaboration';

/**
 * Collaboration provider for Datalayer platform
 */
export class DatalayerCollaborationProvider implements ICollaborationProviderImpl {
  readonly name = 'datalayer';

  /**
   * Create a Datalayer collaboration provider
   * @param options - Collaboration options
   * @returns Promise that resolves to a configured YWebsocketProvider
   */
  async createProvider(options: ICollaborationOptions): Promise<YWebsocketProvider> {
    const { ydoc, awareness, path, token } = options;

    if (!path) {
      throw new Error('Path is required for Datalayer collaboration');
    }

    // Use Datalayer-specific session fetching
    const collaborationUrl = options.collaborationUrl || 'wss://oss.datalayer.run/api/jupyter-server/api/collaboration/room';
    const sessionId = await requestDatalayerollaborationSessionId({ 
      url: collaborationUrl, 
      token 
    });
    
    // Create and configure the websocket provider for Datalayer
    const provider = new YWebsocketProvider(collaborationUrl, sessionId, ydoc, {
      disableBc: true,
      params: {
        sessionId,
        token: token || '',
      },
      awareness,
    });

    return provider;
  }
}