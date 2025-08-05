/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const asDatasource = (s: any): IDatasource => {
  return {
    id: s.uid,
    variant: s.variant_s,
    name: s.name_s,
    description: s.description_t,
    database: s.database_s,
    outputBucket: s.output_bucket_s,
  }
}

export type IDatasourceVariant =
| 'athena'
| 'bigquery'
| 'mssentinel'
| 'splunk'
;

export type IDatasource = {
  id: string;
  variant: IDatasourceVariant;
  name: string;
  description: string;
  database: string;
  outputBucket: string;
}

export default IDatasource;
