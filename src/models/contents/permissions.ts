/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { CatalogSource, ContentSource } from '../../api/contents';

export const CONTENT_SOURCE_KIND_LABELS: Record<ContentSource['kind'], string> = {
  files: 'User Folder',
  dataset: 'Dataset',
  volume: 'Volume',
  'cloud-storage': 'Cloud Storage',
  datasource: 'Datasource',
  'data-server': 'Dataserver',
  mcp: 'MCP',
  environment: 'Environment',
};

export const contentSourceKindLabel = (kind: ContentSource['kind']): string =>
  CONTENT_SOURCE_KIND_LABELS[kind];

export const contentSourceEffectiveRole = (item: CatalogSource): string => {
  if (item.permissions.isOwner) {
    return 'Owner';
  }
  const level = item.permissions.effectiveAccessLevel;
  return level ? `${level[0].toUpperCase()}${level.slice(1)}` : 'No access';
};

export const canViewContentSource = (item: CatalogSource): boolean =>
  item.permissions.view;

export const canUpdateContentSource = (item: CatalogSource): boolean =>
  item.permissions.update;

export const canExecuteContentSource = (item: CatalogSource): boolean =>
  item.permissions.execute;

/** Sharing mutations are owner-only in the v1 Contents service contract. */
export const canShareContentSource = (item: CatalogSource): boolean =>
  item.source.kind !== 'files' && item.permissions.isOwner;
