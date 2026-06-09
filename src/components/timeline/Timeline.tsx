/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { type ReactNode } from 'react';
import { Box, Text } from '@primer/react';

export type TimelineStatus =
  | 'done'
  | 'current'
  | 'pending'
  | 'failed'
  | 'neutral';

export type TimelineItem = {
  id: string;
  title: string;
  timestamp?: string;
  status?: TimelineStatus;
  subtitle?: ReactNode;
};

export type TimelineProps = {
  items: TimelineItem[];
  renderTimestamp?: (value?: string) => ReactNode;
};

const statusStyles: Record<
  TimelineStatus,
  {
    dotBackground: string;
    dotBorder: string;
    lineColor: string;
    titleColor: string;
  }
> = {
  done: {
    dotBackground: 'success.emphasis',
    dotBorder: 'success.emphasis',
    lineColor: 'success.muted',
    titleColor: 'fg.default',
  },
  current: {
    dotBackground: 'attention.emphasis',
    dotBorder: 'attention.emphasis',
    lineColor: 'attention.muted',
    titleColor: 'fg.default',
  },
  pending: {
    dotBackground: 'canvas.default',
    dotBorder: 'border.default',
    lineColor: 'border.default',
    titleColor: 'fg.muted',
  },
  failed: {
    dotBackground: 'danger.emphasis',
    dotBorder: 'danger.emphasis',
    lineColor: 'danger.muted',
    titleColor: 'danger.fg',
  },
  neutral: {
    dotBackground: 'accent.emphasis',
    dotBorder: 'accent.emphasis',
    lineColor: 'accent.muted',
    titleColor: 'fg.default',
  },
};

/**
 * Horizontal metro-style timeline with connected markers and labels.
 *
 * The first item is rendered on the left. Pass items in the desired order
 * (for example: newest to oldest).
 */
export const Timeline = ({ items, renderTimestamp }: TimelineProps) => {
  if (!items.length) {
    return null;
  }

  return (
    <Box
      sx={{
        overflowX: 'auto',
        pb: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          minWidth: 'max-content',
        }}
      >
        {items.map((item, index) => {
          const status = item.status || 'neutral';
          const style = statusStyles[status];
          const hasNext = index < items.length - 1;
          return (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 220,
                flex: hasNext ? '0 0 220px' : '0 0 auto',
                pr: hasNext ? 0 : 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 28,
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: style.dotBorder,
                    bg: style.dotBackground,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                  }}
                />
                {hasNext ? (
                  <Box
                    sx={{
                      flex: 1,
                      height: 4,
                      ml: 2,
                      mr: 2,
                      borderRadius: 999,
                      bg: style.lineColor,
                    }}
                  />
                ) : null}
              </Box>
              <Text
                as="p"
                sx={{ fontWeight: 600, color: style.titleColor, mb: 1 }}
              >
                {item.title}
              </Text>
              <Text
                as="p"
                sx={{
                  fontSize: 0,
                  color: 'fg.muted',
                  mb: item.subtitle ? 1 : 0,
                }}
              >
                {renderTimestamp
                  ? renderTimestamp(item.timestamp)
                  : item.timestamp || 'n/a'}
              </Text>
              {item.subtitle ? (
                <Text as="p" sx={{ fontSize: 0, color: 'fg.subtle' }}>
                  {item.subtitle}
                </Text>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
