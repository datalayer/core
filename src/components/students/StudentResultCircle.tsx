/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMemo } from 'react';
import { useTheme, Tooltip } from '@primer/react';
import { Box } from '@datalayer/primer-addons';

export type StudentResultStatus = 'pass' | 'fail' | 'none';

type Props = {
  /**
   * Result status: success (green), failure (red) or none (no result yet,
   * rendered as a neutral outlined/empty circle with no fill color).
   */
  status: StudentResultStatus;
  /**
   * Human readable explanation shown in the tooltip (e.g. "Exercise passed").
   */
  label: string;
};

/**
 * A small green/red/neutral result circle with an explanatory tooltip.
 *
 * Standalone component reused across the course progress and report views so
 * the meaning of the green (success) / red (failure) / empty (no result yet)
 * status is discoverable on hover and focus.
 */
export const StudentResultCircle = (props: Props) => {
  const { status, label } = props;
  const { theme } = useTheme();
  const okColor = useMemo(
    () => theme?.colorSchemes.light.colors.success.muted,
    [theme],
  );
  const nokColor = useMemo(
    () => theme?.colorSchemes.light.colors.severe.muted,
    [theme],
  );
  const isNone = status === 'none';
  return (
    <Tooltip text={label} aria-label={label}>
      <Box
        as="button"
        type="button"
        aria-label={label}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onMouseDown={event => {
          event.preventDefault();
          event.stopPropagation();
        }}
        sx={{
          display: 'inline-block',
          flex: 'none',
          appearance: 'none',
          p: 0,
          bg: 'transparent',
          cursor: 'default',
          lineHeight: 0,
          border: 'none',
          outline: 'none',
        }}
      >
        <Box
          as="span"
          role="img"
          aria-hidden
          sx={{
            display: 'inline-block',
            flex: 'none',
            width: '14px',
            height: '14px',
            borderRadius: 3,
            ml: 1,
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            backgroundColor: isNone
              ? 'transparent'
              : status === 'pass'
                ? okColor
                : nokColor,
            border: isNone ? '1px solid' : 'none',
            borderColor: isNone ? 'border.default' : 'transparent',
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default StudentResultCircle;
