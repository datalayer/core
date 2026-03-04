/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelMetricsChart – ECharts line-gradient chart for OTEL metrics.
 *
 * Renders one series per metric_name, sorted chronologically,
 * using a gradient area fill inspired by the ECharts line-gradient example.
 *
 * @module otel/OtelMetricsChart
 */

import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartsReact } from '../components/echarts/EChartsReact';
import type { OtelMetric } from './types';

// ── Gradient palette ────────────────────────────────────────────────

/** Predefined colour stops for up to 8 series (loops). */
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

// ── Props ───────────────────────────────────────────────────────────

export interface OtelMetricsChartProps {
  metrics: OtelMetric[];
  /** Chart height in px. Default 280. */
  height?: number;
}

// ── Component ───────────────────────────────────────────────────────

export const OtelMetricsChart: React.FC<OtelMetricsChartProps> = ({
  metrics,
  height = 280,
}) => {
  const option = useMemo<EChartsOption>(() => {
    if (!metrics || metrics.length === 0) {
      return {
        title: {
          text: 'No metrics data',
          left: 'center',
          top: 'center',
          textStyle: { color: '#999', fontSize: 14, fontWeight: 'normal' },
        },
      };
    }

    // Group by metric_name, sort each group by timestamp.
    const groups = new Map<string, { ts: number; value: number }[]>();
    for (const m of metrics) {
      const key = m.metric_name || '(unnamed)';
      const arr = groups.get(key) ?? [];
      if (!groups.has(key)) groups.set(key, arr);
      arr.push({
        ts: new Date(m.timestamp).getTime(),
        value: m.value,
      });
    }

    // Sort each series chronologically.
    for (const points of groups.values()) {
      points.sort((a, b) => a.ts - b.ts);
    }

    const seriesNames = [...groups.keys()];

    // Build ECharts series with line gradient.
    const series: EChartsOption['series'] = seriesNames.map((name, idx) => {
      const palette = SERIES_COLORS[idx % SERIES_COLORS.length];
      const points = groups.get(name) ?? [];
      return {
        name,
        type: 'line' as const,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: palette.line,
        },
        itemStyle: {
          color: palette.line,
        },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: palette.gradientStart },
              { offset: 1, color: palette.gradientEnd },
            ],
          },
        },
        emphasis: {
          focus: 'series' as const,
        },
        data: points.map(p => [p.ts, p.value]),
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: { backgroundColor: '#6a7985' },
        },
      },
      legend: {
        data: seriesNames,
        top: 6,
        textStyle: { fontSize: 11 },
      },
      grid: {
        left: 50,
        right: 20,
        top: 40,
        bottom: 30,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#ccc' } },
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: '#e8e8e8' } },
        axisLine: { show: false },
        axisLabel: { fontSize: 10 },
      },
      series,
    } as EChartsOption;
  }, [metrics]);

  return (
    <EChartsReact
      options={option}
      style={{ width: '100%', height: `${height}px` }}
    />
  );
};

export default OtelMetricsChart;
