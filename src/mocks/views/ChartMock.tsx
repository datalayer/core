/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
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
