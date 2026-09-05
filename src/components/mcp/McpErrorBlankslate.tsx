/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A failure, said in the reader's terms, with a way out of it.
 *
 * The four situations "could not be loaded" covers each call for a
 * different response — sign in, ask for access, wait, report — so the
 * heading and the description come from the application's catalog and the
 * retry button appears only when retrying could plausibly work.
 *
 * @module components/mcp/McpErrorBlankslate
 */

import type { JSX } from 'react';
import { Button, Text } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import {
  AlertIcon,
  LockIcon,
  SearchIcon,
  ShieldLockIcon,
  StopIcon,
} from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import type { McpErrorState } from '../../views/mcp/types';

const VISUAL = {
  unauthenticated: ShieldLockIcon,
  forbidden: LockIcon,
  'not-found': SearchIcon,
  unavailable: StopIcon,
  unknown: AlertIcon,
} as const;

export interface McpErrorBlankslateProps {
  state: McpErrorState;
  /** Asked again; drawn only when the failure is retryable. */
  onRetry?: () => void;
  /** Without a border when it sits inside a panel that has one. */
  border?: boolean;
}

export const McpErrorBlankslate = ({
  state,
  onRetry,
  border = true,
}: McpErrorBlankslateProps): JSX.Element => {
  const Icon = VISUAL[state.reason];
  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <Blankslate border={border} spacious>
        <Blankslate.Visual>
          <Icon size="medium" />
        </Blankslate.Visual>
        <Blankslate.Heading>{state.heading}</Blankslate.Heading>
        <Blankslate.Description>
          <Text sx={{ textAlign: 'center' }}>{state.description}</Text>
        </Blankslate.Description>
        {state.retryable && onRetry && (
          <Button size="small" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Blankslate>
    </Box>
  );
};

export default McpErrorBlankslate;
