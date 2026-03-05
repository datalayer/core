/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSqlView – Ad-hoc DataFusion SQL query panel for the OTEL service.
 *
 * Features:
 *  - Preset query dropdown (spans, logs, metrics)
 *  - Query history persisted to cookie `otel_sql_history` (max 10 entries)
 *  - ⌘/Ctrl + Enter to run
 *
 * Available tables: `spans`, `metrics`, `logs`.
 */

import React, { useState, useCallback } from 'react';
import {
  ActionList,
  ActionMenu,
  Box,
  Button,
  Text,
  Textarea,
  Spinner,
} from '@primer/react';
import { HistoryIcon } from '@primer/octicons-react';
import { useOtelQuery } from './hooks';
import type { OtelQueryRow } from './types';

// ── Cookie helpers ────────────────────────────────────────────────

const HISTORY_COOKIE = 'otel_sql_history';
const HISTORY_MAX = 10;

function readHistory(): string[] {
  try {
    const m = document.cookie.match(/(?:^|;\s*)otel_sql_history=([^;]+)/);
    if (m) return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    // ignore
  }
  return [];
}

function writeHistory(entries: string[]): void {
  try {
    document.cookie = `${HISTORY_COOKIE}=${encodeURIComponent(
      JSON.stringify(entries),
    )};path=/;max-age=31536000`;
  } catch {
    // ignore
  }
}

function pushHistory(sql: string, prev: string[]): string[] {
  const deduped = prev.filter(s => s !== sql);
  return [sql, ...deduped].slice(0, HISTORY_MAX);
}

// ── Preset queries ────────────────────────────────────────────────

interface Preset {
  label: string;
  group: string;
  sql: string;
}

const PRESETS: Preset[] = [
  {
    group: 'Spans',
    label: 'Recent spans',
    sql: 'SELECT trace_id, operation_name, service_name, start_time\nFROM spans\nORDER BY start_time DESC\nLIMIT 20',
  },
  {
    group: 'Spans',
    label: 'Error spans',
    sql: "SELECT trace_id, operation_name, service_name, status_code, status_message\nFROM spans\nWHERE status_code = 'ERROR'\nLIMIT 20",
  },
  {
    group: 'Spans',
    label: 'Span count by service',
    sql: 'SELECT service_name, COUNT(*) AS span_count\nFROM spans\nGROUP BY service_name\nORDER BY span_count DESC',
  },
  {
    group: 'Logs',
    label: 'Recent logs',
    sql: 'SELECT timestamp, severity_text, body, service_name\nFROM logs\nORDER BY timestamp DESC\nLIMIT 20',
  },
  {
    group: 'Logs',
    label: 'Error logs',
    sql: "SELECT timestamp, severity_text, body, service_name\nFROM logs\nWHERE severity_text IN ('ERROR', 'FATAL')\nLIMIT 20",
  },
  {
    group: 'Metrics',
    label: 'Recent metrics',
    sql: 'SELECT metric_name, value_double, metric_unit, service_name, start_time\nFROM metrics\nORDER BY start_time DESC\nLIMIT 20',
  },
  {
    group: 'Metrics',
    label: 'Distinct metric names',
    sql: 'SELECT DISTINCT metric_name, metric_unit\nFROM metrics\nORDER BY metric_name',
  },
];

const PRESET_GROUPS = Array.from(new Set(PRESETS.map(p => p.group)));

// ── Component ─────────────────────────────────────────────────────

export interface OtelSqlViewProps {
  token?: string;
  baseUrl?: string;
}

export const OtelSqlView: React.FC<OtelSqlViewProps> = ({
  token,
  baseUrl = '',
}) => {
  const [sql, setSql] = useState(PRESETS[0].sql);
  const [history, setHistory] = useState<string[]>(() => readHistory());
  const { rows, loading, error, execute } = useOtelQuery({ token, baseUrl });

  const handleRun = useCallback(() => {
    const trimmed = sql.trim();
    if (!trimmed) return;
    const next = pushHistory(trimmed, history);
    setHistory(next);
    writeHistory(next);
    execute(trimmed);
  }, [sql, history, execute]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const columns: string[] =
    rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        gap: 3,
        p: 4,
        bg: 'canvas.default',
        color: 'fg.default',
        overflow: 'auto',
      }}
    >
      {/* ── Toolbar: presets + hint ── */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
      >
        <ActionMenu>
          <ActionMenu.Button size="small">Preset queries</ActionMenu.Button>
          <ActionMenu.Overlay width="large">
            <ActionList>
              {PRESET_GROUPS.map(group => (
                <ActionList.Group key={group} title={group}>
                  {PRESETS.filter(p => p.group === group).map(p => (
                    <ActionList.Item
                      key={p.label}
                      onSelect={() => setSql(p.sql)}
                    >
                      {p.label}
                    </ActionList.Item>
                  ))}
                </ActionList.Group>
              ))}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
          ⌘ Enter to run · Tables:{' '}
          <Box as="code" sx={{ fontFamily: 'mono', fontSize: 0 }}>
            spans
          </Box>
          {', '}
          <Box as="code" sx={{ fontFamily: 'mono', fontSize: 0 }}>
            metrics
          </Box>
          {', '}
          <Box as="code" sx={{ fontFamily: 'mono', fontSize: 0 }}>
            logs
          </Box>
        </Text>
      </Box>

      {/* ── SQL editor ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Textarea
          aria-label="SQL query"
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT … FROM spans LIMIT 20"
          rows={5}
          resize="vertical"
          sx={{ fontFamily: 'mono', fontSize: 1, width: '100%' }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="primary"
            onClick={handleRun}
            disabled={loading}
            size="small"
          >
            {loading ? 'Running…' : 'Run'}
          </Button>
          {loading && <Spinner size="small" />}
        </Box>
      </Box>

      {/* ── Query history ── */}
      {history.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HistoryIcon size={12} />
            <Text sx={{ fontSize: 0, fontWeight: 'bold', color: 'fg.muted' }}>
              History
            </Text>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {history.map((entry, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 3,
                  py: '6px',
                  cursor: 'pointer',
                  bg: i % 2 === 0 ? 'canvas.default' : 'canvas.subtle',
                  borderTop: i > 0 ? '1px solid' : 'none',
                  borderColor: 'border.muted',
                  '&:hover': { bg: 'accent.subtle' },
                }}
                onClick={() => setSql(entry)}
              >
                <Text
                  sx={{
                    fontFamily: 'mono',
                    fontSize: 0,
                    color: 'fg.default',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.replace(/\s+/g, ' ')}
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.subtle', flexShrink: 0 }}>
                  restore ↑
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Error banner ── */}
      {error && (
        <Box
          sx={{
            p: 3,
            bg: 'danger.subtle',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'danger.muted',
          }}
        >
          <Text sx={{ color: 'danger.fg', fontFamily: 'mono', fontSize: 1 }}>
            {error}
          </Text>
        </Box>
      )}

      {/* ── Results table ── */}
      {!error && rows.length > 0 && (
        <Box
          sx={{
            flex: 1,
            minHeight: 200,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <Box as="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box as="thead">
              <Box as="tr" sx={{ bg: 'canvas.subtle' }}>
                {columns.map(col => (
                  <Box
                    key={col}
                    as="th"
                    sx={{
                      px: 3,
                      py: 2,
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: 0,
                      color: 'fg.muted',
                      borderBottom: '1px solid',
                      borderColor: 'border.default',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody">
              {(rows as OtelQueryRow[]).map((row, ri) => (
                <Box
                  key={ri}
                  as="tr"
                  sx={{
                    '&:hover': { bg: 'canvas.subtle' },
                    '&:not(:last-child) td': {
                      borderBottom: '1px solid',
                      borderColor: 'border.muted',
                    },
                  }}
                >
                  {columns.map(col => (
                    <Box
                      key={col}
                      as="td"
                      sx={{
                        px: 3,
                        py: 2,
                        fontSize: 0,
                        fontFamily: 'mono',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(row[col] ?? '')}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Empty state ── */}
      {!error && !loading && rows.length === 0 && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'fg.muted',
          }}
        >
          <Text sx={{ fontSize: 1 }}>Run a query to see results.</Text>
        </Box>
      )}
    </Box>
  );
};

const DEFAULT_SQL =
  'SELECT trace_id, operation_name, service_name FROM spans LIMIT 20';

export interface OtelSqlViewProps {
  token?: string;
  baseUrl?: string;
}

export const OtelSqlView: React.FC<OtelSqlViewProps> = ({
  token,
  baseUrl = '',
}) => {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const { rows, loading, error, execute } = useOtelQuery({ token, baseUrl });

  const handleRun = () => {
    if (sql.trim()) {
      execute(sql.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter → run query
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const columns: string[] =
    rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        gap: 3,
        p: 4,
        bg: 'canvas.default',
        color: 'fg.default',
      }}
    >
      {/* ── Editor area ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Textarea
          aria-label="SQL query"
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT … FROM spans LIMIT 20"
          rows={5}
          resize="vertical"
          sx={{
            fontFamily: 'mono',
            fontSize: 1,
            width: '100%',
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="primary"
            onClick={handleRun}
            disabled={loading}
            size="small"
          >
            {loading ? 'Running…' : 'Run'}
          </Button>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            ⌘ Enter to run · Tables: <code>spans</code>, <code>metrics</code>,{' '}
            <code>logs</code>
          </Text>
          {loading && <Spinner size="small" />}
        </Box>
      </Box>

      {/* ── Error banner ── */}
      {error && (
        <Box
          sx={{
            p: 3,
            bg: 'danger.subtle',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'danger.muted',
          }}
        >
          <Text sx={{ color: 'danger.fg', fontFamily: 'mono', fontSize: 1 }}>
            {error}
          </Text>
        </Box>
      )}

      {/* ── Results table ── */}
      {!error && rows.length > 0 && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <Box as="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box as="thead">
              <Box as="tr" sx={{ bg: 'canvas.subtle' }}>
                {columns.map(col => (
                  <Box
                    key={col}
                    as="th"
                    sx={{
                      px: 3,
                      py: 2,
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: 0,
                      color: 'fg.muted',
                      borderBottom: '1px solid',
                      borderColor: 'border.default',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody">
              {(rows as OtelQueryRow[]).map((row, ri) => (
                <Box
                  key={ri}
                  as="tr"
                  sx={{
                    '&:hover': { bg: 'canvas.subtle' },
                    '&:not(:last-child) td': {
                      borderBottom: '1px solid',
                      borderColor: 'border.muted',
                    },
                  }}
                >
                  {columns.map(col => (
                    <Box
                      key={col}
                      as="td"
                      sx={{
                        px: 3,
                        py: 2,
                        fontSize: 0,
                        fontFamily: 'mono',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(row[col] ?? '')}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Empty state ── */}
      {!error && !loading && rows.length === 0 && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'fg.muted',
          }}
        >
          <Text sx={{ fontSize: 1 }}>Run a query to see results.</Text>
        </Box>
      )}
    </Box>
  );
};
