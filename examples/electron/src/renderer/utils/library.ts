/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/utils/library
 * @description Utility functions for document library operations and formatting.
 */

import { FileIcon, BookIcon } from '@primer/octicons-react';
import { DocumentItem } from '../../shared/types';

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffHours < 168) {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getDocumentIcon = (document: DocumentItem) => {
  const itemType = document.type || document.type_s || document.item_type || '';
  if (itemType.toLowerCase() === 'notebook') {
    return BookIcon;
  }
  return FileIcon;
};

export const createDataHash = (data: any[]): string => {
  return JSON.stringify(
    data.map(item => ({
      id: item.id || item.uid,
      name: item.name || item.name_t,
      modified: item.last_update_ts_dt || item.modified_at,
    }))
  );
};

export const sortByModifiedDate = (
  a: DocumentItem,
  b: DocumentItem
): number => {
  return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
};

export const mapApiItemToDocumentItem = (
  item: Record<string, unknown>
): DocumentItem => ({
  id: String(item.id || item.uid || item.path || ''),
  uid: item.uid as string | undefined,
  name: String(
    item.name_t ||
      item.name ||
      (item.path as string)?.split('/').pop() ||
      'Untitled'
  ),
  path: String(item.path || `/${item.name_t || item.name || 'document'}`),
  createdAt: String(
    item.creation_ts_dt || item.created_at || new Date().toISOString()
  ),
  modifiedAt: String(
    item.last_update_ts_dt || item.modified_at || new Date().toISOString()
  ),
  size:
    (item.content_length_i as number | undefined) ||
    (item.size as number | undefined),
  kernel: (item.kernel_spec as any)?.display_name || 'Python 3',
  cdnUrl: item.cdn_url_s as string | undefined,
  description: item.description_t as string | undefined,
  type: item.type as string | undefined,
  type_s: item.type_s as string | undefined,
  item_type: item.item_type as string | undefined,
});

export const groupDocumentsByType = (documentItems: DocumentItem[]) => {
  const notebooks = documentItems.filter(item => {
    const itemType = item.type || item.type_s || item.item_type || '';
    return itemType.toLowerCase() === 'notebook';
  });

  const documents = documentItems.filter(item => {
    const itemType = item.type || item.type_s || item.item_type || '';
    return itemType.toLowerCase() === 'document';
  });

  return {
    notebooks: notebooks.sort(sortByModifiedDate),
    documents: documents.sort(sortByModifiedDate),
  };
};
