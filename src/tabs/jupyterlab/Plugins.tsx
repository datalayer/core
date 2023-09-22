import { useState, useEffect } from 'react';
import { Text } from '@primer/react';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { JupyterFrontEndProps } from '../../Datalayer';
import { PluginsNetwork } from './PluginsNetwork';

echarts.use(
  [
    CanvasRenderer,
    GraphChart,
    GridComponent,
    LegendComponent,
    TitleComponent,
    TooltipComponent,
  ]
);

const Plugins = (props: JupyterFrontEndProps) => {
  const { app } = props;
  const [option, setOption] = useState<any>(undefined);
  useEffect(() => {
    const plugins = (app as any)['_plugins'];
    const pluginsModel = new PluginsNetwork({ plugins });
    const option = {
      showLoading: true,
      tooltip: {},
      legend: [
        {
          orient: 'vertical',
//          type: 'scroll',
          x: 'left',
          right: 10,
          data: pluginsModel.categories.map(function (category) {
            return category.name;
          }),
        }
      ],
      animationDurationUpdate: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          name: 'JupyterLab Plugins',
          type: 'graph',
          layout: 'circular',
          center: ['30%', '45%'], // [x, y]
          circular: {
            rotateLabel: true,
          },
          data: pluginsModel.nodes,
          links: pluginsModel.edges,
          categories: pluginsModel.categories,
          roam: true,
          label: {
            position: 'right',
            formatter: '{b}'
          },
          lineStyle: {
            color: 'source',
            curveness: 0.3,
          }
        }
      ]
    };
    setOption(option);
  }, [app]);
  return <>
    <Text as="h4" sx={{margin: 0, paddingTop: 0, paddingBottom: 0, paddingLeft: 1}}>Plugins</Text>
    {option ?
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: 'calc(100vh - 160px)' }}
        notMerge={true}
        lazyUpdate={true}
      />
      :
      <></>
    }
  </>;
}

export default Plugins;
