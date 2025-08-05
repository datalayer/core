/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { INotebookContent } from '@jupyterlab/nbformat';
import { IUser, asUser } from './User';
import { PageTagName } from './PageTag';
import { asRuntimeSnapshot, IRuntimeSnapshot } from './RuntimeSnapshot';

export type PageTheme = 
  'default';

export type PageVariant =
  'document' |
  'cell' |
  'notebook'
  ;

/**
 * Page attributes.
 * 
 * - Notebook
 * - Screen Capture
 * - Theme
 * - Tags
 * - Video Explainer
 * - Kernel Launcher Button
 * - Kernel Snapshot
 * - Share Button
 * - Stars Counter - 1 ⭐ -> 1 Credit
 */
export type IPage = {
  id: string;
  variant: PageVariant;
  type: 'page';
  name: string;
  description: string;
  theme: PageTheme;
  tags: Array<PageTagName>;
  nbformat: INotebookContent;
  screenCapture?: string;
  creator?: IUser,
  creatorId?: string;
  kernelSnapshot?: IRuntimeSnapshot;
  kernelSnapshotId?: string;
};

export const asPage = (s: any): IPage => {
  return {
    id: s.uid,
    type: 'page',
    variant: s.variant_s,
    name: s.name_t,
    description: s.description_t,
    theme: s.theme_s,
    nbformat: s.nbformat_s ? JSON.parse(s.nbformat_s) : undefined,
    screenCapture: s.screen_capture_s,
    tags: (s.tags_ss ?? []),
    creator: s.creator ? asUser(s.creator) : undefined,
    creatorId: s.creator_uid,
    kernelSnapshot: s.kernel_snapshot ? asRuntimeSnapshot(s.kernel_snapshot) : undefined,
    kernelSnapshotId: s.kernel_snapshot_uid,
  }
}

export default IPage;
