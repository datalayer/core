/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { IDatasource } from '../../models';

/** Invented records used when the real Datasources view is embedded in docs. */
export const DATASOURCES_MOCK: IDatasource[] = [
  {
    id: 'datasource-earth-observation',
    variant: 'bigquery',
    name: 'Earth Observation Analytics',
    description: 'Curated satellite observations for geospatial analysis.',
    database: 'earth_observation',
    outputBucket: '',
  },
  {
    id: 'datasource-lakehouse',
    variant: 'athena',
    name: 'Research Lakehouse',
    description: 'Shared Parquet datasets queried through Amazon Athena.',
    database: 'research',
    outputBucket: 'datalayer-query-results',
  },
];
