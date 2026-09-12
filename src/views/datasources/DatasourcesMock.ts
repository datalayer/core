/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { CatalogSource } from '../../api/contents';

const OWNER = '01HZZZZZZZZZZZZZZZZZZZZZZZ';

const catalog = (
  uid: string,
  name: string,
  description: string,
  configuration: Record<string, unknown>,
): CatalogSource => ({
  source: {
    contractVersion: 'v1',
    uid,
    kind: 'datasource',
    name,
    description,
    principalUid: OWNER,
    principalKind: 'user',
    configuration: { kind: 'datasource', ...configuration } as CatalogSource['source']['configuration'],
    capabilities: ['query'],
    status: 'ready',
    createdAt: '2026-08-24T12:00:00Z',
    updatedAt: '2026-08-24T12:00:00Z',
  },
  permissions: {
    view: true,
    update: true,
    execute: true,
    effectiveAccessLevel: 'execute',
    isOwner: true,
  },
});

/** Invented records used when the real Datasources view is embedded in docs. */
export const DATASOURCES_MOCK: CatalogSource[] = [
  catalog(
    '01DATASRC0EARTH00000000000',
    'Earth Observation Analytics',
    'Curated satellite observations for geospatial analysis.',
    {
      connectorType: 'bigquery',
      databaseOrProject: 'earth-observation',
      networkRoute: 'direct',
      credentialUid: '01CREDENT1AL00000000000000',
      allowedOperations: ['select', 'describe', 'list'],
      defaultRowLimit: 10000,
    },
  ),
  catalog(
    '01DATASRC0LAKEH0USE0000000',
    'Research Lakehouse',
    'Shared Parquet datasets queried through Amazon Athena.',
    {
      connectorType: 'athena',
      databaseOrProject: 'research',
      networkRoute: 'direct',
      credentialUid: '01CREDENT1AL00000000000001',
      allowedOperations: ['select', 'describe'],
      defaultRowLimit: 5000,
    },
  ),
  catalog(
    '01DATASRC0PR1VATE000000000',
    'Private Warehouse',
    'An on-premises PostgreSQL reached through the Frankfurt Dataserver.',
    {
      connectorType: 'sql',
      endpoint: 'warehouse.internal:5432',
      databaseOrProject: 'analytics',
      networkRoute: 'dataserver',
      dataServerUid: '01DATASRV0FRANKFURT0000000',
      allowedOperations: ['select'],
      defaultRowLimit: 1000,
      maxSeconds: 60,
    },
  ),
];
