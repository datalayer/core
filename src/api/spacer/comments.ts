/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Comments on documents and notebooks (BENCHMARK.md, B4-01).
 *
 * A thread is its first comment, about one anchor — the highlighted text, a
 * report's evidence block, a cell, a task, a data point — and a reply names
 * its thread. The comments of an item are read and written on the item's
 * route, changed and settled on the comment's, and followed on a websocket
 * that says `subscribed` once it listens and then each comment written.
 *
 * @module api/spacer/comments
 */

import {
  spacerRequest,
  spacerSegment,
  spacerUrl,
  type SpacerClientOptions,
} from './request';

export type CommentItemType = 'lexical' | 'notebook';

export type CommentAnchorKind =
  | 'mark_id'
  | 'block_id'
  | 'cell_id'
  | 'case_id'
  | 'datum';

/** What a thread is about: exactly one kind. */
export type CommentAnchor = Partial<Record<CommentAnchorKind, string>>;

export type CommentStatus = 'open' | 'resolved';

export interface SpacerComment {
  uid: string;
  item_uid: string;
  item_type: CommentItemType;
  /** The uid of the thread's first comment; that comment's own. */
  thread_uid: string;
  /** A thread's; `null` on a reply. */
  anchor: CommentAnchor | null;
  quote: string | null;
  /** Empty once deleted. */
  body: string;
  author: SpacerCommentPerson;
  mentions: string[];
  /** A thread's; `null` on a reply and on a thread nobody is assigned. */
  assignee: SpacerCommentPerson | null;
  /** The page a thread is read on; `null` on a reply. */
  link: string | null;
  /** A thread's; `null` on a reply. */
  status: CommentStatus | null;
  resolution: string | null;
  resolved_by_uid: string | null;
  resolved_at: string | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

/** Somebody a comment names: its author, a thread's assignee. */
export interface SpacerCommentPerson {
  uid: string;
  handle: string | null;
  name: string | null;
  /** On an author: the agent that wrote the comment for them, when one did. */
  agent_uid?: string;
}

export interface AddCommentRequest {
  body: string;
  /** A new thread's. */
  anchor?: CommentAnchor;
  quote?: string;
  /**
   * The page a new thread is read on, a path of the app: where a mention or
   * an assignment sends the person it names.
   */
  link?: string;
  /** A reply's thread. */
  thread_uid?: string;
  mentions?: string[];
  assignee_uid?: string;
}

/** What is named changes; `assignee_uid: null` unassigns. */
export interface UpdateCommentRequest {
  body?: string;
  mentions?: string[];
  assignee_uid?: string | null;
  deleted?: true;
}

export interface CommentsResponse {
  success: boolean;
  comments: SpacerComment[];
}

export interface CommentResponse {
  success: boolean;
  comment: SpacerComment;
}

export type CommentsChannelMessage =
  | { type: 'subscribed'; item_uid: string }
  | { type: 'comment'; comment: SpacerComment };

const itemComments = (itemType: CommentItemType, itemUid: string): string =>
  `/${itemType === 'lexical' ? 'lexicals' : 'notebooks'}/${spacerSegment(itemUid)}/comments`;

/** An item's comments in the order written, deleted ones in their place. */
export const listComments = (
  options: SpacerClientOptions,
  itemType: CommentItemType,
  itemUid: string,
  status?: CommentStatus,
): Promise<CommentsResponse> =>
  spacerRequest(options, itemComments(itemType, itemUid), {
    query: { status },
  });

/** Open a thread on an item, or reply in one of its threads. */
export const addComment = (
  options: SpacerClientOptions,
  itemType: CommentItemType,
  itemUid: string,
  body: AddCommentRequest,
): Promise<CommentResponse> =>
  spacerRequest(options, itemComments(itemType, itemUid), {
    method: 'POST',
    body,
  });

export const updateComment = (
  options: SpacerClientOptions,
  uid: string,
  body: UpdateCommentRequest,
): Promise<CommentResponse> =>
  spacerRequest(options, `/comments/${spacerSegment(uid)}`, {
    method: 'PATCH',
    body,
  });

export const resolveComment = (
  options: SpacerClientOptions,
  uid: string,
  resolution?: string,
): Promise<CommentResponse> =>
  spacerRequest(options, `/comments/${spacerSegment(uid)}/resolve`, {
    method: 'POST',
    body: resolution ? { resolution } : {},
  });

export const reopenComment = (
  options: SpacerClientOptions,
  uid: string,
): Promise<CommentResponse> =>
  spacerRequest(options, `/comments/${spacerSegment(uid)}/reopen`, {
    method: 'POST',
  });

/** The websocket an item's comments are followed on, carrying the token. */
export const commentsChannelUrl = (
  options: SpacerClientOptions,
  itemUid: string,
): string =>
  spacerUrl(options, `/comments/ws/${spacerSegment(itemUid)}`, {
    token: options.token,
  }).replace(/^http/, 'ws');
