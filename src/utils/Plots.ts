/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import type { IUsage } from '../models';
import { getDate, getDaysInMonth, getMonth, isSameMonth, isSameYear } from 'date-fns';

/**
 * Compute the data for plotting the usage histogram.
 *
 * @param usages Usages
 * @param interval Histogram interval
 * @param range Range with month in 1-based scale
 * @returns Histogram data {x: [], y: []}
 */
export function createHistogram(
  usages: IUsage[],
  interval: number,
  range: { month: number; year: number }
) {
  const referenceDate = new Date(range.year, range.month - 1);
  const now = Date.now();
  const credits = usages
    .filter(c =>
      interval === 0
        ? isSameMonth(c.startDate, referenceDate)
        : isSameYear(c.startDate, referenceDate)
    )
    .map(c => {
      const start = c.startDate;
      const end = c.endDate?.getTime() ?? now;
      return {
        credits:
          typeof c.credits === 'number'
            ? c.credits
            : ((end - start.getTime()) * c.burningRate) / 1000,
        // getDate is 1-based but getMonth is 0-based
        category: interval === 0 ? getDate(start) - 1 : getMonth(start)
      };
    })
    .reduce<number[]>(
      (agg, d) => {
        agg[d.category] += d.credits;
        return agg;
      },
      new Array(interval === 0 ? getDaysInMonth(referenceDate) : 12).fill(0)
    )
    .map(c => Math.round(c));
  return {
    x:
      interval === 0
        ? credits.map((_, i) => `${i + 1}`)
        : [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
          ],
    y: credits
  };
}
