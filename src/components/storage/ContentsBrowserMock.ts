/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Contents } from '@jupyterlab/services';

const timestamp = '2026-08-24T08:00:00.000Z';

function directory(
  name: string,
  path: string,
  content: Contents.IModel[],
): Contents.IModel {
  return {
    name,
    path,
    type: 'directory',
    writable: true,
    created: timestamp,
    last_modified: timestamp,
    mimetype: '',
    content,
    format: 'json',
  };
}

function file(name: string, path: string): Contents.IModel {
  return {
    name,
    path,
    type: 'file',
    writable: true,
    created: timestamp,
    last_modified: timestamp,
    mimetype: 'application/octet-stream',
    content: null,
    format: null,
  };
}

const entries = new Map<string, Contents.IModel>();

const workspace = directory('workspace', 'workspace', [
  file('analysis.ipynb', 'workspace/analysis.ipynb'),
  file('prepare_data.py', 'workspace/prepare_data.py'),
  directory('results', 'workspace/results', [
    file('summary.parquet', 'workspace/results/summary.parquet'),
  ]),
]);

const data = directory('data', 'data', [
  directory('earth-observation', 'data/earth-observation', [
    file('manifest.json', 'data/earth-observation/manifest.json'),
    file('observations.parquet', 'data/earth-observation/observations.parquet'),
  ]),
  directory('model-artifacts', 'data/model-artifacts', [
    file('checkpoint.bin', 'data/model-artifacts/checkpoint.bin'),
  ]),
]);

const environment = directory('environment', 'environment', [
  directory('tutorials', 'environment/tutorials', [
    file('README.md', 'environment/tutorials/README.md'),
    file('example.ipynb', 'environment/tutorials/example.ipynb'),
  ]),
  directory('reference-data', 'environment/reference-data', [
    file('sentinel-catalog.json', 'environment/reference-data/sentinel-catalog.json'),
  ]),
]);

const root = directory('', '', [workspace, data, environment]);

function index(model: Contents.IModel): void {
  entries.set(model.path, model);
  if (model.type === 'directory' && Array.isArray(model.content)) {
    model.content.forEach(index);
  }
}

index(root);

/** Invented sandbox filesystem used by documentation previews. */
export const CONTENTS_BROWSER_MOCK_MANAGER = {
  serverSettings: { appUrl: 'mock://code-sandbox/' },
  get: async (path: string) => entries.get(path) ?? root,
  save: async (path: string, model: Partial<Contents.IModel>) => ({
    ...file(model.name ?? path, path),
    ...model,
  }),
  delete: async () => undefined,
} as unknown as Contents.IManager;
