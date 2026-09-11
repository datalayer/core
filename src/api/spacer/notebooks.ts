/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A notebook's content, read by its uid.
 *
 * What a view needs when it shows a notebook it did not open — the outputs of
 * a notebook an agent produced, previewed in its execution's report — without
 * starting an editor or a kernel.
 *
 * @module api/spacer/notebooks
 */

import {
  spacerRequest,
  spacerSegment,
  type SpacerClientOptions,
} from './request';

/** One cell, as nbformat writes it. */
export interface NotebookCell {
  cell_type: string;
  source?: string | string[];
  outputs?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** A notebook, as nbformat writes it. */
export interface NotebookModel {
  cells: NotebookCell[];
  metadata?: Record<string, unknown>;
  nbformat?: number;
  nbformat_minor?: number;
}

/**
 * The notebook's content, or `undefined` when Spacer holds none that parses.
 *
 * @param options - The Spacer origin and the caller's token.
 * @param notebookUid - The notebook.
 * @returns The notebook's model.
 */
export const getNotebookModel = async (
  options: SpacerClientOptions,
  notebookUid: string,
): Promise<NotebookModel | undefined> => {
  const answer = await spacerRequest<{ notebook?: { model_s?: string } }>(
    options,
    `/notebooks/${spacerSegment(notebookUid)}`,
  );
  const raw = answer.notebook?.model_s;
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.cells) ? parsed : undefined;
  } catch {
    return undefined;
  }
};
