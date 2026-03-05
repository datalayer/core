/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSystemView – System statistics panel for the OTEL service.
 *
 * Calls GET /api/otel/v1/system/ (platform_admin only) and renders:
 *  - Process memory / CPU
 *  - Disk usage
 *  - Per-table row counts, distinct users and disk
 *  - Total distinct users
 */

import React from 'react';
import { Box, Button, Spinner, Text } from '@primer/react';
import { SyncIcon } from '@primer/octicons-react';
import { useOtelSystem } from '../hooks';
import type { OtelSystemData } from '../hooks';

// ── Helpers ───────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ── Sub-components ────────────────────────────────────────────────

const CARD_SX = {
  bg: 'canvas.subtle',
  border: '1px solid',
  borderColor: 'border.default',
  borderRadius: 2,
  p: 3,
  mb: 3,
};

const LABEL_SX = {
  display: 'block',
  fontSize: 0,
  fontWeight: 'bold',
  color: 'fg.muted',
  mb: 1,
};

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 3,
};

interface StatCellProps {
  label: string;
  value: string;
}

const StatCell: React.FC<StatCellProps> = ({ label, value }) => (
  <Box>
    <Text sx={LABEL_SX}>{label}</Text>
    <Text sx={{ fontSize: 1, fontFamily: 'mono' }}>{value}</Text>
  </Box>
);

interface SystemViewContentProps {
  data: OtelSystemData;
}

const SystemViewContent: React.FC<SystemViewContentProps> = ({ data }) => {
  const { process: proc, disk, tables, total_distinct_users } = data;

  return (
    <Box>
      {/* Process */}
      <Box sx={CARD_SX}>
        <Text sx={{ fontSize: 1, fontWeight: 'bold', mb: 2, display: 'block' }}>
          Process
        </Text>
        {proc?.error ? (
          <Text sx={{ color: 'attention.fg', fontSize: 0 }}>{proc.error}</Text>
        ) : (
          <Box sx={GRID_SX}>
            <StatCell
              label="RSS Memory"
              value={fmtBytes(proc?.memory_rss_bytes ?? 0)}
            />
            <StatCell
              label="VMS Memory"
              value={fmtBytes(proc?.memory_vms_bytes ?? 0)}
            />
            <StatCell
              label="CPU"
              value={`${(proc?.cpu_percent ?? 0).toFixed(1)} %`}
            />
            <StatCell
              label="Threads"
              value={String(proc?.num_threads ?? '?')}
            />
          </Box>
        )}
      </Box>

      {/* Disk */}
      <Box sx={CARD_SX}>
        <Text sx={{ fontSize: 1, fontWeight: 'bold', mb: 2, display: 'block' }}>
          Disk
        </Text>
        {disk?.error ? (
          <Text sx={{ color: 'attention.fg', fontSize: 0 }}>{disk.error}</Text>
        ) : (
          <Box sx={GRID_SX}>
            <StatCell label="Data Dir" value={disk?.data_dir ?? '?'} />
            <StatCell label="Total" value={fmtBytes(disk?.total_bytes ?? 0)} />
            <StatCell
              label="Used"
              value={`${fmtBytes(disk?.used_bytes ?? 0)} (${(disk?.used_percent ?? 0).toFixed(1)}%)`}
            />
            <StatCell label="Free" value={fmtBytes(disk?.free_bytes ?? 0)} />
          </Box>
        )}
      </Box>

      {/* Tables */}
      {tables && Object.keys(tables).length > 0 && (
        <Box sx={CARD_SX}>
          <Text
            sx={{ fontSize: 1, fontWeight: 'bold', mb: 2, display: 'block' }}
          >
            Tables
          </Text>
          <Box
            as="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 0,
              fontFamily: 'mono',
            }}
          >
            <Box as="thead">
              <Box as="tr">
                {['Table', 'Rows', 'Users', 'Disk'].map(h => (
                  <Box
                    key={h}
                    as="th"
                    sx={{
                      textAlign: h === 'Table' ? 'left' : 'right',
                      pb: 1,
                      color: 'fg.muted',
                      fontWeight: 'bold',
                      borderBottom: '1px solid',
                      borderColor: 'border.default',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody">
              {Object.entries(tables).map(([tbl, info]) => (
                <Box as="tr" key={tbl}>
                  <Box as="td" sx={{ py: 1, pr: 3, color: 'accent.fg' }}>
                    {tbl}
                  </Box>
                  {info?.error ? (
                    <Box as="td" colSpan={3} sx={{ color: 'danger.fg', py: 1 }}>
                      {info.error}
                    </Box>
                  ) : (
                    <>
                      <Box as="td" sx={{ textAlign: 'right', py: 1, pr: 3 }}>
                        {(info.row_count ?? 0).toLocaleString()}
                      </Box>
                      <Box as="td" sx={{ textAlign: 'right', py: 1, pr: 3 }}>
                        {info.distinct_users ?? 0}
                      </Box>
                      <Box as="td" sx={{ textAlign: 'right', py: 1 }}>
                        {fmtBytes(info.disk_bytes ?? 0)}
                      </Box>
                    </>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Summary */}
      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
        Total distinct users across all tables:{' '}
        <Text sx={{ fontWeight: 'bold', color: 'fg.default' }}>
          {total_distinct_users ?? '?'}
        </Text>
      </Text>
    </Box>
  );
};

// ── OtelSystemView ────────────────────────────────────────────────

export interface OtelSystemViewProps {
  baseUrl?: string;
  token?: string;
}

export const OtelSystemView: React.FC<OtelSystemViewProps> = ({
  baseUrl = '',
  token,
}) => {
  const { data, loading, error, refresh } = useOtelSystem({ baseUrl, token });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        p: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexShrink: 0,
        }}
      >
        <Text sx={{ fontSize: 2, fontWeight: 'bold' }}>System Statistics</Text>
        <Button
          size="small"
          variant="invisible"
          onClick={refresh}
          disabled={loading}
          leadingVisual={SyncIcon}
        >
          Refresh
        </Button>
      </Box>

      {/* States */}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Spinner size="small" />
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Loading…</Text>
        </Box>
      )}

      {!loading && error && (
        <Box
          sx={{
            bg: 'danger.subtle',
            border: '1px solid',
            borderColor: 'danger.muted',
            borderRadius: 2,
            p: 3,
          }}
        >
          <Text sx={{ color: 'danger.fg', fontSize: 1 }}>{error}</Text>
        </Box>
      )}

      {!loading && !error && data && <SystemViewContent data={data} />}

      {!loading && !error && !data && (
        <Text sx={{ color: 'fg.muted', fontSize: 1 }}>No data available.</Text>
      )}
    </Box>
  );
};
