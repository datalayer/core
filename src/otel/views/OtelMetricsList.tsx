/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelMetricsList – Tabular view of metric data points grouped by
 * metric name, with expandable rows showing individual data points.
 *
 * Uses Primer React components for consistent theming.
 *
 * @module otel/OtelMetricsList
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Text,
  Label,
  Spinner,
  CounterLabel,
  SegmentedControl,
} from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import {
  MeterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GraphIcon,
  TableIcon,
} from '@primer/octicons-react';
import type { OtelMetric, OtelMetricsListProps } from '../types';
import { formatTime } from '../utils';
import { OtelMetricsChart } from './OtelMetricsChart';

export type { OtelMetricsListProps } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────

/** Group metrics by metric_name. */
function groupByName(metrics: OtelMetric[]): Map<string, OtelMetric[]> {
  const map = new Map<string, OtelMetric[]>();
  for (const m of metrics) {
    const key = m.metric_name || '(unnamed)';
    if (!map.has(key)) map.set(key, []);
    const group = map.get(key);
    if (group) group.push(m);
  }
  return map;
}

/** Format a metric value with optional unit. */
function formatValue(value: number, unit?: string): string {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(3);
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Map metric_type to a Primer Label variant. */
function typeVariant(
  type?: string,
): 'accent' | 'attention' | 'secondary' | 'primary' | 'success' {
  switch (type?.toLowerCase()) {
    case 'gauge':
      return 'accent';
    case 'counter':
    case 'sum':
      return 'attention';
    case 'histogram':
      return 'secondary';
    case 'exponentialhistogram':
      return 'success';
    default:
      return 'primary';
  }
}

// ── MetricGroup  ────────────────────────────────────────────────────

const MetricGroup: React.FC<{
  name: string;
  points: OtelMetric[];
}> = ({ name, points }) => {
  const [expanded, setExpanded] = useState(false);
  const first = points[0];

  // Compute stats
  const stats = useMemo(() => {
    const values = points.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];
    const timestamps = points
      .map(p => new Date(p.timestamp).getTime())
      .filter(t => !isNaN(t));
    const startTs = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const endTs = timestamps.length > 0 ? Math.max(...timestamps) : null;
    return { min, max, avg, latest, startTs, endTs };
  }, [points]);

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'border.default',
      }}
    >
      {/* Group header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'grid',
          gridTemplateColumns: '20px 1fr auto auto auto auto',
          gap: 3,
          alignItems: 'center',
          px: 3,
          py: 2,
          cursor: 'pointer',
          ':hover': { bg: 'canvas.subtle' },
        }}
      >
        {expanded ? (
          <ChevronDownIcon size={16} />
        ) : (
          <ChevronRightIcon size={16} />
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>{name}</Text>
            {first?.metric_type && (
              <Label size="small" variant={typeVariant(first.metric_type)}>
                {first.metric_type}
              </Label>
            )}
            {first?.unit && (
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                ({first.unit})
              </Text>
            )}
          </Box>
          {stats.startTs !== null && stats.endTs !== null && (
            <Text sx={{ fontSize: 0, color: 'fg.subtle', fontFamily: 'mono' }}>
              {formatTime(new Date(stats.startTs).toISOString())}
              {stats.startTs !== stats.endTs && (
                <> → {formatTime(new Date(stats.endTs).toISOString())}</>
              )}
            </Text>
          )}
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>latest</Text>
          <Text
            sx={{ fontSize: 1, fontWeight: 'bold', fontFamily: 'mono', ml: 1 }}
          >
            {formatValue(stats.latest, first?.unit)}
          </Text>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>avg</Text>
          <Text sx={{ fontSize: 1, fontFamily: 'mono', ml: 1 }}>
            {stats.avg.toFixed(2)}
          </Text>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>min/max</Text>
          <Text sx={{ fontSize: 1, fontFamily: 'mono', ml: 1 }}>
            {stats.min.toFixed(1)}–{stats.max.toFixed(1)}
          </Text>
        </Box>

        <CounterLabel>{points.length}</CounterLabel>
      </Box>

      {/* Expanded data points */}
      {expanded && (
        <Box sx={{ bg: 'canvas.subtle' }}>
          {/* Column header */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '20px 180px 1fr 140px 160px',
              gap: 3,
              px: 3,
              py: 1,
              borderTop: '1px solid',
              borderColor: 'border.muted',
            }}
          >
            <Box />
            <Text sx={{ fontSize: 0, fontWeight: 'bold', color: 'fg.muted' }}>
              Time
            </Text>
            <Text sx={{ fontSize: 0, fontWeight: 'bold', color: 'fg.muted' }}>
              Service
            </Text>
            <Text
              sx={{
                fontSize: 0,
                fontWeight: 'bold',
                color: 'fg.muted',
                textAlign: 'right',
              }}
            >
              Value
            </Text>
            <Text
              sx={{
                fontSize: 0,
                fontWeight: 'bold',
                color: 'fg.muted',
                textAlign: 'right',
              }}
            >
              Attributes
            </Text>
          </Box>

          {/* Data rows */}
          {points.map((point, idx) => (
            <MetricRow key={`${point.timestamp}-${idx}`} metric={point} />
          ))}
        </Box>
      )}
    </Box>
  );
};

// ── MetricRow ───────────────────────────────────────────────────────

const MetricRow: React.FC<{ metric: OtelMetric }> = ({ metric }) => {
  const [showAttrs, setShowAttrs] = useState(false);
  const attrCount = metric.attributes
    ? Object.keys(metric.attributes).length
    : 0;

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '20px 180px 1fr 140px 160px',
          gap: 3,
          alignItems: 'center',
          px: 3,
          py: 1,
          borderTop: '1px solid',
          borderColor: 'border.muted',
          ':hover': { bg: 'canvas.inset' },
        }}
      >
        <Box />
        <Text sx={{ fontSize: 0, fontFamily: 'mono', color: 'fg.muted' }}>
          {formatTime(metric.timestamp)}
        </Text>
        <Text sx={{ fontSize: 0 }}>{metric.service_name}</Text>
        <Text
          sx={{
            fontSize: 1,
            fontFamily: 'mono',
            fontWeight: 'bold',
            textAlign: 'right',
          }}
        >
          {formatValue(metric.value, metric.unit)}
        </Text>
        <Box sx={{ textAlign: 'right' }}>
          {attrCount > 0 ? (
            <Label
              size="small"
              variant="secondary"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setShowAttrs(!showAttrs);
              }}
              sx={{ cursor: 'pointer' }}
            >
              {attrCount} attr{attrCount !== 1 ? 's' : ''}
            </Label>
          ) : (
            <Text sx={{ fontSize: 0, color: 'fg.muted' }}>—</Text>
          )}
        </Box>
      </Box>
      {showAttrs && metric.attributes && (
        <Box sx={{ px: 5, py: 2, bg: 'canvas.inset' }}>
          <Box
            as="pre"
            sx={{
              m: 0,
              fontSize: 0,
              fontFamily: 'mono',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(metric.attributes, null, 2)}
          </Box>
        </Box>
      )}
    </>
  );
};

// ── OtelMetricsList ─────────────────────────────────────────────────

const COOKIE_KEY = 'otel_metrics_view';

function readViewCookie(): 'chart' | 'table' {
  try {
    const match = document.cookie.match(/(?:^|;\s*)otel_metrics_view=([^;]+)/);
    if (match && (match[1] === 'chart' || match[1] === 'table'))
      return match[1];
  } catch {
    // ignore
  }
  return 'table';
}

function writeViewCookie(v: 'chart' | 'table') {
  try {
    document.cookie = `${COOKIE_KEY}=${v};path=/;max-age=31536000`;
  } catch {
    // ignore
  }
}

export const OtelMetricsList: React.FC<OtelMetricsListProps> = ({
  metrics,
  loading = false,
}) => {
  const [view, setView] = useState<'chart' | 'table'>(readViewCookie);

  const handleViewChange = (v: 'chart' | 'table') => {
    writeViewCookie(v);
    setView(v);
  };
  const grouped = useMemo(() => groupByName(metrics), [metrics]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 5,
        }}
      >
        <Spinner size="medium" />
      </Box>
    );
  }

  if (metrics.length === 0) {
    return (
      <Blankslate>
        <Blankslate.Visual>
          <MeterIcon size={20} />
        </Blankslate.Visual>
        <Blankslate.Heading>No metrics yet</Blankslate.Heading>
        <Blankslate.Description>
          Generate some metrics or adjust the filters above.
        </Blankslate.Description>
      </Blankslate>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Toolbar — fixed height, does not scroll */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 3,
          py: 2,
          bg: 'canvas.subtle',
          borderBottom: '1px solid',
          borderColor: 'border.default',
          zIndex: 0,
        }}
      >
        <SegmentedControl
          aria-label="Metrics view"
          size="small"
          onChange={(idx: number) =>
            handleViewChange(idx === 0 ? 'chart' : 'table')
          }
        >
          <SegmentedControl.IconButton
            icon={GraphIcon}
            aria-label="Chart"
            selected={view === 'chart'}
          />
          <SegmentedControl.IconButton
            icon={TableIcon}
            aria-label="Table"
            selected={view === 'table'}
          />
        </SegmentedControl>
      </Box>

      {/* Scroll area */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {view === 'chart' ? (
          <Box sx={{ px: 3, py: 2 }}>
            <OtelMetricsChart metrics={metrics} height={280} />
          </Box>
        ) : (
          <>
            {/* Column header — sticky inside this scroll container */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '20px 1fr auto auto auto auto',
                gap: 3,
                px: 3,
                py: 1,
                bg: 'canvas.subtle',
                borderBottom: '2px solid',
                borderColor: 'border.default',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              <Box />
              {['Metric Name', 'Latest', 'Average', 'Min/Max', 'Points'].map(
                (h, i) => (
                  <Text
                    key={h}
                    sx={{
                      fontSize: 0,
                      fontWeight: 'bold',
                      color: 'fg.muted',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: i === 0 ? undefined : 'right',
                    }}
                  >
                    {h}
                  </Text>
                ),
              )}
            </Box>

            {[...grouped.entries()].map(([name, points]) => (
              <MetricGroup key={name} name={name} points={points} />
            ))}
          </>
        )}
      </Box>
    </Box>
  );
};
