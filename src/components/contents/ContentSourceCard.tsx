/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Label, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import type { CatalogSource } from '../../api/contents';
import {
  contentSourceEffectiveRole,
  contentSourceLabel,
} from '../../models/contents';

export type ContentSourceCardProps = {
  item: CatalogSource;
  onOpen?: (sourceUid: string) => void;
};

/** Compact, host-neutral catalog row shared by Datalayer clients. */
export const ContentSourceCard = ({ item, onOpen }: ContentSourceCardProps) => (
  <Box
    as="li"
    onClick={() => onOpen?.(item.source.uid)}
    p={3}
    borderColor="border.muted"
    cursor={onOpen ? 'pointer' : 'default'}
    hover={onOpen ? { bg: 'canvas.subtle' } : undefined}
    sx={{
      borderBottom: '1px solid',
      ':last-child': { borderBottom: 0 },
    }}
  >
    <Box display="flex" justifyContent="space-between" gap={3}>
      <Box minWidth={0}>
        <Text sx={{ fontWeight: 600 }}>{item.source.name}</Text>
        <Text as="p" sx={{ color: 'fg.muted', fontSize: 0, m: 0, mt: 1 }}>
          {item.source.description || contentSourceLabel(item.source.kind)}
        </Text>
        <Text as="p" sx={{ color: 'fg.subtle', fontSize: 0, m: 0, mt: 1 }}>
          {item.source.uid}
        </Text>
      </Box>
      <Box display="flex" alignItems="center" gap={2} flexShrink={0}>
        <Label>{contentSourceLabel(item.source.kind)}</Label>
        <Label
          variant={item.source.status === 'ready' ? 'success' : 'secondary'}
        >
          {item.source.status}
        </Label>
        <Label variant="accent">{contentSourceEffectiveRole(item)}</Label>
      </Box>
    </Box>
  </Box>
);

export default ContentSourceCard;
