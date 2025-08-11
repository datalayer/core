/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useRef, useState, CSSProperties } from 'react';
import type { ECharts, EChartsOption, SetOptionOpts } from 'echarts';
import { init } from 'echarts';

// Modified from https://dev.to/manufac/using-apache-echarts-with-react-and-typescript-353k

export interface EChartsProps {
  options: EChartsOption;
  style?: CSSProperties;
  settings?: SetOptionOpts;
  loading?: boolean;
  theme?: 'light' | 'dark';
}

export const EChartsReact = ({
  options,
  style,
  settings,
  loading,
  theme
}: EChartsProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<ECharts | undefined>();
  useEffect(() => {
    const chart = chartRef.current ? init(chartRef.current, theme) : undefined;
    // Add chart resize listener
    // ResizeObserver is leading to a bit janky UX
    const resizeChart = () => {
      if (chart && !chart.isDisposed()) {
        chart.resize();
      }
    };
    if (chart) {
      window.addEventListener('resize', resizeChart);
    }
    setChart(chart);
    // Return cleanup function.
    return () => {
      if (chart) {
        if (!chart.isDisposed()) {
          chart.dispose();
        }
        window.removeEventListener('resize', resizeChart);
        setChart(undefined);
      }
    };
  }, [chartRef.current, theme]);
  useEffect(() => {
    // Update chart.
    if (chart && !chart.isDisposed()) {
      chart.setOption(options, settings);
    }
  }, [chart, options, settings]);
  useEffect(() => {
    if (chart && !chart.isDisposed()) {
      if (loading === true) {
        chart.showLoading();
      } else {
        chart.hideLoading();
      }
    }
  }, [chart, loading]);
  return (
    <div ref={chartRef} style={{ width: '100%', height: '100px', ...style }} />
  );
}

export default EChartsReact;
