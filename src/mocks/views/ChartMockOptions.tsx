/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const ECHART_MOCK_1 = {
  grid: { top: 8, right: 8, bottom: 24, left: 36 },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      data: [820, 932, 901, 934, 1290, 1330, 1320],
      type: 'line',
      smooth: true,
    },
  ],
  tooltip: {
    trigger: 'axis',
  },
}

export const ECHART_MOCK_2 = {
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      data: [
        120,
        {
          value: 200,
          itemStyle: {
            color: '#a90000'
          }
        },
        150,
        80,
        70,
        110,
        130
      ],
      type: 'bar'
    }
  ]
}

export const ECHART_MOCK_3 = {
  title: [
    {
      text: 'Radial Polar Bar Label Position (middle)'
    }
  ],
  polar: {
    radius: [30, '80%']
  },
  radiusAxis: {
    max: 4
  },
  angleAxis: {
    type: 'category',
    data: ['a', 'b', 'c', 'd'],
    startAngle: 75
  },
  tooltip: {},
  series: {
    type: 'bar',
    data: [2, 1.2, 2.4, 3.6],
    coordinateSystem: 'polar',
    label: {
      show: true,
      position: 'middle',
      formatter: '{b}: {c}'
    }
  },
  animation: true
}

export const CHART_4 = {
  grid: { top: 20, right: 40, bottom: 20, left: 40 },
  xAxis: {
    type: "category",
    data: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"]
  },
  yAxis: {
    type: "value"
  },
  series: [
    {
      data: [400, 300, 350, 200, 280],
      type: "bar",
      smooth: true
    }
  ],
  tooltip: {
    trigger: "axis"
  }
}
