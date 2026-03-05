/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelMetricsChart – Type-aware ECharts visualisation for OTEL metrics.
 *
 * Renders one chart section per `metric_type` (`sum`, `histogram`, `gauge`,
 * and any other type present) with an appropriate chart style:
 *
 * - **sum** (counters): area-line chart with gradient fill
 * - **histogram**: bar chart with grouped series
 * - **gauge**: plain line chart (no area fill)
 * - **other**: falls back to area-line
 *
 * @module otel/OtelMetricsChart
 */

import React from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Box, Text, Label } from '@primer/react';
import type { OtelMetric } from './types';

// ── Gradient palette ────────────────────────────────────────────────

const SERIES_COLORS: Array<{
  line: string;
  gradientStart: string;
  gradientEnd: string;
}> = [
  {
    line: '#5470C6',
    gradientStart: 'rgba(84,112,198,0.7)',
    gradientEnd: 'rgba(84,112,198,0.02)',
  },
  {
    line: '#91CC75',
    gradientStart: 'rgba(145,204,117,0.7)',
    gradientEnd: 'rgba(145,204,117,0.02)',
  },
  {
    line: '#EE6666',
    gradientStart: 'rgba(238,102,102,0.7)',
    gradientEnd: 'rgba(238,102,102,0.02)',
  },
  {
    line: '#FAC858',
    gradientStart: 'rgba(250,200,88,0.7)',
    gradientEnd: 'rgba(250,200,88,0.02)',
  },
  {
    line: '#73C0DE',
    gradientStart: 'rgba(115,192,222,0.7)',
    gradientEnd: 'rgba(115,192,222,0.02)',
  },
  {
    line: '#FC8452',
    gradientStart: 'rgba(252,132,82,0.7)',
    gradientEnd: 'rgba(252,132,82,0.02)',
  },
  {
    line: '#9A60B4',
    gradientStart: 'rgba(154,96,180,0.7)',
    gradientEnd: 'rgba(154,96,180,0.02)',
  },
  {
    line: '#EA7CCC',
    gradientStart: 'rgba(234,124,204,0.7)',
    gradientEnd: 'rgba(234,124,204,0.02)',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

/** Group metrics by metric_type, then by metric_name within each type. */
function groupByType(
  metrics: OtelMetric[],
): Map<string, Map<string, { ts: number; value: number }[]>> {
  const byType = new Map<
    string,
    Map<string, { ts: number; value: number }[]>
  >();
  for (const m of metrics) {
    const mtype = m.metric_type || 'other';
    if (!byType.has(mtype)) byType.set(mtype, new Map());
    const nameMap = byType.get(mtype)!;
    const key = m.metric_name || '(unnamed)';
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push({
      ts: new Date(m.timestamp).getTime(),
      value: m.value,
    });
  }
  // Sort points chronologically within each name group.
  for (const nameMap of byType.values()) {
    for (const points of nameMap.values()) {
      points.sort((a, b) => a.ts - b.ts);
    }
  }
  return byType;
}

/** Human-friendly label for a metric type. */
function typeTitle(mtype: string): string {
  switch (mtype) {
    case 'sum':
      return 'Counters (sum)';
    case 'histogram':
      return 'Histograms';
    case 'gauge':
      return 'Gauges';
    case 'exponentialHistogram':
      return 'Exponential Histograms';
    default:
      return mtype.charAt(0).toUpperCase() + mtype.slice(1);
  }
}

/** Label variant for the type badge. */
function typeVariant(
  mtype: string,
): 'accent' | 'attention' | 'secondary' | 'primary' | 'success' {
  switch (mtype) {
    case 'gauge':
      return 'accent';
    case 'sum':
      return 'attention';
    case 'histogram':
      return 'secondary';
    case 'exponentialHistogram':
      return 'success';
    default:
      return 'primary';
  }
}

/** Preferred display order. Types not listed appear at the end. */
const TYPE_ORDER: Record<string, number> = {
  sum: 0,
  histogram: 1,
  gauge: 2,
  exponentialHistogram: 3,
};

// ── Build ECharts option per type ──────────────────────────────────

function buildOption(
  mtype: string,
  nameMap: Map<string, { ts: number; value: number }[]>,
): Record<string, unknown> {
  const names = [...nameMap.keys()];

  const baseLegend = {
    data: names,
    top: 6,
    textStyle: { fontSize: 11 },
  };
  const baseGrid = { left: 50, right: 20, top: 40, bottom: 30 };
  const baseTooltip = {
    trigger: 'axis' as const,
    axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
  };
  const baseXAxis = {
    type: 'time' as const,
    boundaryGap: false as boolean | [string, string],
    axisLine: { lineStyle: { color: '#ccc' } },
    axisLabel: { fontSize: 10 },
  };
  const baseYAxis = {
    type: 'value' as const,
    splitLine: { lineStyle: { type: 'dashed', color: '#e8e8e8' } },
    axisLine: { show: false },
    axisLabel: { fontSize: 10 },
  };

  if (mtype === 'histogram' || mtype === 'exponentialHistogram') {
    // ── Bar chart ──
    const series = names.map((name, idx) => {
      const palette = SERIES_COLORS[idx % SERIES_COLORS.length];
      const points = nameMap.get(name) ?? [];
      return {
        name,
        type: 'bar',
        barMaxWidth: 20,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: palette.gradientStart },
            { offset: 1, color: palette.line },
          ]),
          borderRadius: [2, 2, 0, 0],
        },
        emphasis: { focus: 'series' },
        data: points.map(p => [p.ts, p.value]),
      };
    });
    return {
      tooltip: baseTooltip,
      legend: baseLegend,
      grid: baseGrid,
      xAxis: { ...baseXAxis, boundaryGap: true },
      yAxis: baseYAxis,
      series,
    };
  }

  if (mtype === 'gauge') {
    // ── Simple line chart (no area) ──
    const series = names.map((name, idx) => {
      const palette = SERIES_COLORS[idx % SERIES_COLORS.length];
      const points = nameMap.get(name) ?? [];
      return {
        name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: true,
        lineStyle: { width: 2, color: palette.line },
        itemStyle: { color: palette.line },
        emphasis: { focus: 'series' },
        data: points.map(p => [p.ts, p.value]),
      };
    });
    return {
      tooltip: baseTooltip,
      legend: baseLegend,
      grid: baseGrid,
      xAxis: baseXAxis,
      yAxis: baseYAxis,
      series,
    };
  }

  // ── Default (sum / other): area-line with gradient ──
  const series = names.map((name, idx) => {
    const palette = SERIES_COLORS[idx % SERIES_COLORS.length];
    const points = nameMap.get(name) ?? [];
    return {
      name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      showSymbol: false,
      lineStyle: { width: 2, color: palette.line },
      itemStyle: { color: palette.line },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: palette.gradientStart },
          { offset: 1, color: palette.gradientEnd },
        ]),
      },
      emphasis: { focus: 'series' },
      data: points.map(p => [p.ts, p.value]),
    };
  });
  return {
    tooltip: baseTooltip,
    legend: baseLegend,
    grid: baseGrid,
    xAxis: baseXAxis,
    yAxis: baseYAxis,
    series,
  };
}

// ── Stats helpers ───────────────────────────────────────────────────

interface SectionStats {
  total: number;
  count: number;
  startTs: number | null;
  endTs: number | null;
}

function computeStats(
  nameMap: Map<string, { ts: number; value: number }[]>,
): SectionStats {
  let total = 0;
  let count = 0;
  let startTs: number | null = null;
  let endTs: number | null = null;
  for (const points of nameMap.values()) {
    for (const p of points) {
      total += p.value;
      count += 1;
      if (startTs === null || p.ts < startTs) startTs = p.ts;
      if (endTs === null || p.ts > endTs) endTs = p.ts;
    }
  }
  return { total, count, startTs, endTs };
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

// ── Props ───────────────────────────────────────────────────────────

export interface OtelMetricsChartProps {
  metrics: OtelMetric[];
  /** Height per chart panel in px. Default 240. */
  height?: number;
}

// ── Component ───────────────────────────────────────────────────────

export const OtelMetricsChart: React.FC<OtelMetricsChartProps> = ({
  metrics,
  height = 240,
}) => {
  if (!metrics || metrics.length === 0) {
    return (
      <ReactECharts
        echarts={echarts}
        option={{
          title: {
            text: 'No metrics data',
            left: 'center',
            top: 'center',
            textStyle: { color: '#999', fontSize: 14, fontWeight: 'normal' },
          },
        }}
        style={{ width: '100%', height: `${height}px` }}
        notMerge={true}
      />
    );
  }

  const byType = groupByType(metrics);

  // Sort types in a stable, user-friendly order.
  const sortedTypes = [...byType.keys()].sort(
    (a, b) => (TYPE_ORDER[a] ?? 99) - (TYPE_ORDER[b] ?? 99),
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
      }}
    >
      {sortedTypes.map(mtype => {
        const nameMap = byType.get(mtype)!;
        const option = buildOption(mtype, nameMap);
        const stats = computeStats(nameMap);
        const durationMs =
          stats.startTs !== null && stats.endTs !== null
            ? stats.endTs - stats.startTs
            : null;
        return (
          <Box key={mtype}>
            {/* Section header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 1,
                mb: 1,
              }}
            >
              <Label size="small" variant={typeVariant(mtype)}>
                {mtype}
              </Label>
              <Text sx={{ fontSize: 1, fontWeight: 'bold', color: 'fg.muted' }}>
                {typeTitle(mtype)}
              </Text>
              <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
                ({[...nameMap.keys()].join(', ')})
              </Text>
            </Box>

            {/* Stats row: sum + time interval */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                px: 1,
                mb: 1,
              }}
            >
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                <Text
                  as="span"
                  sx={{ fontWeight: 'bold', color: 'fg.default' }}
                >
                  Sum:
                </Text>{' '}
                {stats.total.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </Text>
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                <Text
                  as="span"
                  sx={{ fontWeight: 'bold', color: 'fg.default' }}
                >
                  Points:
                </Text>{' '}
                {stats.count}
              </Text>
              {stats.startTs !== null && stats.endTs !== null && (
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  <Text
                    as="span"
                    sx={{ fontWeight: 'bold', color: 'fg.default' }}
                  >
                    Interval:
                  </Text>{' '}
                  {formatTs(stats.startTs)} → {formatTs(stats.endTs)}
                  {durationMs !== null && durationMs > 0 && (
                    <Text as="span" sx={{ color: 'fg.subtle' }}>
                      {' '}
                      ({formatDuration(durationMs)})
                    </Text>
                  )}
                </Text>
              )}
            </Box>

            <ReactECharts
              echarts={echarts}
              option={option}
              style={{ width: '100%', height: `${height}px` }}
              notMerge={true}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default OtelMetricsChart;
