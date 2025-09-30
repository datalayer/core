/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module api/spacer/documents
 * @description Documents API functions for the Datalayer platform.
 *
 * Provides functions for document operations including collaboration session management.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { CollaborationSessionResponse } from '../types/spacer';

/**
 * Get collaboration session ID for a document.
 *
 * This function attempts to retrieve the collaboration session ID from the document API.
 *
 * @param token - Authentication token
 * @param documentId - Document UID
 * @param baseUrl - Base URL for the API (defaults to production)
 * @returns Promise resolving to collaboration session response
 */
export const getCollaborationSessionId = async (
  token: string,
  documentId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.SPACER,
): Promise<CollaborationSessionResponse> => {
  try {
    const response = await requestDatalayerAPI<{ sessionId?: string }>({
      url: `${baseUrl}${API_BASE_PATHS.SPACER}/documents/${documentId}`,
      method: 'GET',
      token,
    });
    return {
      success: true,
      sessionId: response.sessionId || documentId, // FIXME: is this ok?
    };
  } catch (error) {
    // FIXME: is this ok?
    return {
      success: true,
      sessionId: documentId,
    };
  }
};
