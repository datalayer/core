/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export { OtelClient, createOtelClient } from './OtelClient';
export type {
  OtelClientOptions,
  FetchTracesOptions,
  FetchLogsOptions,
  FetchMetricsOptions,
  FetchMetricTotalOptions,
  OtelSystemData,
  OtelSystemProcess,
  OtelSystemDisk,
  OtelSystemTable,
} from './OtelClient';
