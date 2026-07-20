/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { formatFriendlyHandle } from '../../utils/Handles';

export type DisplayHandleProps = {
  handle?: string;
  withAt?: boolean;
  fallback?: string;
};

export const displayHandleText = (
  handle?: string,
  options?: { withAt?: boolean; fallback?: string },
): string => {
  const withAt = options?.withAt ?? true;
  const fallback = options?.fallback ?? 'unknown';
  const friendly = formatFriendlyHandle(handle);
  const normalized = String(friendly || '').trim() || fallback;
  return withAt ? `@${normalized}` : normalized;
};

export const DisplayHandle: React.FC<DisplayHandleProps> = ({
  handle,
  withAt = true,
  fallback = 'unknown',
}) => <>{displayHandleText(handle, { withAt, fallback })}</>;

export default DisplayHandle;
