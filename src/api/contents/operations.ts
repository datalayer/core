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
import { contentsToCamelCase, type JsonValue } from '../../models/contents';
import type { OperationView } from './generated';

const operationUrl = (baseUrl: string, operationUid: string): string =>
  `${baseUrl}${API_BASE_PATHS.CONTENTS}/operations/${encodeURIComponent(operationUid)}`;

const convertResponse = (value: unknown): OperationView =>
  contentsToCamelCase(value as JsonValue) as unknown as OperationView;

export const getOperation = async (
  token: string,
  operationUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<OperationView> =>
  convertResponse(
    await requestDatalayerAPI({
      url: operationUrl(baseUrl, operationUid),
      method: 'GET',
      token,
    }),
  );

export const cancelOperation = async (
  token: string,
  operationUid: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.CONTENTS,
): Promise<OperationView> =>
  convertResponse(
    await requestDatalayerAPI({
      url: `${operationUrl(baseUrl, operationUid)}/cancel`,
      method: 'POST',
      token,
    }),
  );
