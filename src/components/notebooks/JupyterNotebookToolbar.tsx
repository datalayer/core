/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  CircleCurrentColorIcon,
  CircleGreenIcon,
  CircleOrangeIcon,
} from '@datalayer/icons-react';
import { Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import {
  Sparklines,
  SparklinesBars,
  SparklinesLine,
  SparklinesReferenceLine,
} from 'react-sparklines';
import { JupyterReactTheme } from '@datalayer/jupyter-react';

function boxMullerRandom() {
  let phase = false;
  let x1: number;
  let x2: number;
  let w: number;
  return (function () {
    if ((phase = !phase)) {
      do {
        x1 = 2.0 * Math.random() - 1.0;
        x2 = 2.0 * Math.random() - 1.0;
        w = x1 * x1 + x2 * x2;
      } while (w >= 1.0);

      w = Math.sqrt((-2.0 * Math.log(w)) / w);
      return x1 * w;
    } else {
      return x2! * w!;
    }
  })();
}

function randomData(n = 30) {
  return Array.apply(0, Array(n)).map(boxMullerRandom);
}

const SAMPLE_DATA_30 = randomData(30);

const SAMPLE_DATA_100 = randomData(100);

export const JupyterNotebookToolbar = () => {
  return (
    <JupyterReactTheme>
      <Box display="flex" m={5}>
        <Box ml={3}>
          <Box mb={3}>
            <Text>Notebook Kernel: python3</Text>
          </Box>
          <Box display="flex">
            <Box width={100} height={100}>
              <Sparklines data={SAMPLE_DATA_30}>
                <SparklinesLine color="#fa7e17" />
                <SparklinesReferenceLine type="mean" />
              </Sparklines>
            </Box>
            <Box width={100} height={100} ml={3}>
              <Sparklines data={SAMPLE_DATA_100}>
                <SparklinesBars
                  style={{ fill: '#41c3f9', fillOpacity: '.25' }}
                />
                <SparklinesLine style={{ stroke: '#41c3f9', fill: 'none' }} />
              </Sparklines>
            </Box>
          </Box>
        </Box>
        <Box ml={6}>
          <Box mb={3}>
            <Text>Running Cells</Text>
          </Box>
          <Box display="flex">
            <Box>
              <CircleGreenIcon />
            </Box>
            <Box>
              <CircleCurrentColorIcon style={{ color: 'white' }} />
            </Box>
            <Box>
              <CircleCurrentColorIcon style={{ color: 'white' }} />
            </Box>
            <Box>
              <CircleOrangeIcon />
            </Box>
            <Box>
              <CircleGreenIcon />
            </Box>
            <Box>
              <CircleCurrentColorIcon style={{ color: 'white' }} />
            </Box>
          </Box>
        </Box>
        <Box ml={6}>
          <Box mb={3}>
            <Text>Credit: 12/100</Text>
          </Box>
        </Box>
      </Box>
    </JupyterReactTheme>
  );
};

export default JupyterNotebookToolbar;
