/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { contentsToCamelCase } from '../../models/contents';
import type { JsonValue } from '../../models/contents';
import type {
  ContentsCapabilities,
  OperationCapability,
  SourceKindCapability,
} from './generated';

/*
 * The shapes are the generated ones — the service's own models, regenerated
 * from its OpenAPI document — under the names the clients read them by.
 * Declaring them here a second time is how the two drifted apart once.
 */
export type ContentsSourceKindCapability = SourceKindCapability;
export type ContentsOperationCapability = OperationCapability;
export type { ContentsCapabilities };

/**
 * Ask the service what this caller can reach, create and count.
 *
 * A client cannot answer either question on its own: it does not know which
 * parts of Contents are deployed here, nor what this principal may use.
 */
export const getCapabilities = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<ContentsCapabilities> => {
  const value = await requestDatalayerAPI({
    url: `${baseUrl}${API_BASE_PATHS.CONTENTS}/capabilities`,
    method: 'GET',
    token,
  });
  return contentsToCamelCase(value as JsonValue) as unknown as ContentsCapabilities;
};
