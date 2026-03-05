/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSearchBar – Filter toolbar with signal-type tabs, service selector,
 * query input, and refresh action.
 *
 * Uses Primer React components for consistent theming.
 *
 * @module otel/OtelSearchBar
 */

import React from 'react';
import {
  Box,
  SegmentedControl,
  ActionMenu,
  ActionList,
  TextInput,
  Button,
} from '@primer/react';
import { SyncIcon, SearchIcon } from '@primer/octicons-react';
import type { OtelSearchBarProps, SignalType } from '../types';

const SIGNALS: { value: SignalType; label: string }[] = [
  { value: 'traces', label: 'Traces' },
  { value: 'logs', label: 'Logs' },
  { value: 'metrics', label: 'Metrics' },
];

export const OtelSearchBar: React.FC<OtelSearchBarProps> = ({
  signal,
  onSignalChange,
  services,
  selectedService,
  onServiceChange,
  query,
  onQueryChange,
  onRefresh,
  loading,
}) => {
  const safeServices = Array.isArray(services) ? services : [];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 2,
        bg: 'canvas.subtle',
        borderBottom: '1px solid',
        borderColor: 'border.default',
        flexWrap: 'wrap',
      }}
    >
      {/* Signal type tabs */}
      <SegmentedControl
        aria-label="Signal type"
        size="small"
        onChange={idx => onSignalChange(SIGNALS[idx].value)}
      >
        {SIGNALS.map(s => (
          <SegmentedControl.Button
            key={s.value}
            selected={s.value === signal}
            aria-label={s.label}
          >
            {s.label}
          </SegmentedControl.Button>
        ))}
      </SegmentedControl>

      {/* Service selector */}
      <ActionMenu>
        <ActionMenu.Button size="small" variant="invisible">
          {selectedService || 'All services'}
        </ActionMenu.Button>
        <ActionMenu.Overlay width="auto">
          <ActionList selectionVariant="single">
            <ActionList.Item
              selected={selectedService === ''}
              onSelect={() => onServiceChange('')}
            >
              All services
            </ActionList.Item>
            {safeServices.length > 0 && <ActionList.Divider />}
            {safeServices.map(svc => (
              <ActionList.Item
                key={svc}
                selected={selectedService === svc}
                onSelect={() => onServiceChange(svc)}
              >
                {svc}
              </ActionList.Item>
            ))}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>

      {/* Search / query input */}
      <Box sx={{ flex: 1, minWidth: 180 }}>
        <TextInput
          leadingVisual={SearchIcon}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search spans, logs, metrics…"
          size="small"
          block
          aria-label="Search telemetry"
        />
      </Box>

      {/* Refresh button */}
      {onRefresh && (
        <Button
          size="small"
          leadingVisual={SyncIcon}
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh"
        >
          Refresh
        </Button>
      )}
    </Box>
  );
};
