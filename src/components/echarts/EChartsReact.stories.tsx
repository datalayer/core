/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { EChartsOption } from 'echarts';

import { EChartsReact } from './EChartsReact';

const meta = {
  title: 'Datalayer/ECharts/EChartsReact',
  component: EChartsReact,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    theme: {
      control: 'select',
      options: ['light', 'dark'],
      description: 'Chart theme',
    },
  },
} satisfies Meta<typeof EChartsReact>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicLineChartOptions: EChartsOption = {
  title: {
    text: 'Basic Line Chart',
  },
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    data: ['Sales', 'Revenue'],
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: 'Sales',
      type: 'line',
      stack: 'Total',
      data: [120, 132, 101, 134, 90, 230, 210],
    },
    {
      name: 'Revenue',
      type: 'line',
      stack: 'Total',
      data: [220, 182, 191, 234, 290, 330, 310],
    },
  ],
};

const barChartOptions: EChartsOption = {
  title: {
    text: 'Monthly Usage',
  },
  tooltip: {},
  legend: {
    data: ['Usage'],
  },
  xAxis: {
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  },
  yAxis: {},
  series: [
    {
      name: 'Usage',
      type: 'bar',
      data: [5, 20, 36, 10, 10, 20],
    },
  ],
};

const pieChartOptions: EChartsOption = {
  title: {
    text: 'Resource Distribution',
    left: 'center',
  },
  tooltip: {
    trigger: 'item',
  },
  legend: {
    orient: 'vertical',
    left: 'left',
  },
  series: [
    {
      name: 'Resources',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: 'CPU' },
        { value: 735, name: 'Memory' },
        { value: 580, name: 'Storage' },
        { value: 484, name: 'GPU' },
        { value: 300, name: 'Network' },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
};

export const LineChart: Story = {
  args: {
    options: basicLineChartOptions,
    style: { height: '400px' },
  },
};

export const BarChart: Story = {
  args: {
    options: barChartOptions,
    style: { height: '400px' },
  },
};

export const PieChart: Story = {
  args: {
    options: pieChartOptions,
    style: { height: '400px' },
  },
};

export const LoadingState: Story = {
  args: {
    options: basicLineChartOptions,
    loading: true,
    style: { height: '400px' },
  },
};

export const DarkTheme: Story = {
  args: {
    options: basicLineChartOptions,
    theme: 'dark',
    style: { height: '400px' },
  },
};

export const SmallChart: Story = {
  args: {
    options: barChartOptions,
    style: { height: '200px' },
  },
};
