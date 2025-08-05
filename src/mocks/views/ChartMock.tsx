/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Heading } from '@primer/react-brand';
import { lazyWithPreload, WithSuspense } from "../../utils";
import { HorizontalCenter } from '../../components/display';
import { CHART_4 } from './ChartMockOptions';

const ReactEcharts = WithSuspense(lazyWithPreload(() => import("echarts-for-react")), true);

type Props = {
  title: string
}

export const ChartMock = (props: Props) => {
  const { title } = props;
  return (
    <HorizontalCenter>
      <Heading size="3">{title}</Heading>
      <ReactEcharts
        option={CHART_4}
        style={{ width: "600px", height: "300px" }}
      />
    </HorizontalCenter>
  );
};

export default ChartMock;
