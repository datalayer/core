/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { useEffect, useState } from 'react';
import { Box, Button, Label } from '@primer/react';
import { Cell, KernelIndicator, useKernelsStore, useCellsStore, Kernel } from '@datalayer/jupyter-react';
import { ServiceManager } from '@jupyterlab/services';
import { createServerSettings, getJupyterServerUrl, getJupyterServerToken } from '@datalayer/jupyter-react';

const CELL_ID = 'cell-example-1';

const DEFAULT_SOURCE = `from IPython.display import display

for i in range(10):
    display('I am a long string which is repeatedly added to the dom in separated divs: %d' % i)`;

type ICellExampleProps = {
  serviceManager?: ServiceManager.IManager;
}

export const CellExample = (props: ICellExampleProps) => {
  const [kernel, setKernel] = useState<Kernel | undefined>();
  const [serviceManager, setServiceManager] = useState<ServiceManager.IManager | undefined>(props.serviceManager);
  const kernelsStore = useKernelsStore();
  
  useEffect(() => {
    // Create service manager if not provided
    if (!props.serviceManager) {
      const serverSettings = createServerSettings(
        getJupyterServerUrl(),
        getJupyterServerToken()
      );
      const manager = new ServiceManager({ serverSettings });
      setServiceManager(manager);
    }
  }, [props.serviceManager]);
  
  useEffect(() => {
    if (!kernel && serviceManager) {
      // Create a kernel using the service manager
      const createKernel = async () => {
        // Create a Kernel wrapper
        const k = new Kernel({
          kernelName: 'python3',
        } as any);
        // @ts-expect-error - Set service manager after construction
        k._serviceManager = serviceManager;
        await k.ready;
        setKernel(k);
      };
      createKernel();
    }
  }, [serviceManager]);
  const cellsStore = useCellsStore();
  
  if (!kernel) {
    return (
      <Box p={4}>
        <Box as="h1">A Jupyter Cell</Box>
        <Box>Loading kernel...</Box>
      </Box>
    );
  }
  
  return (
    <>
      <Box as="h1">A Jupyter Cell</Box>
      <Box>
        Source: {cellsStore.getSource(CELL_ID)}
      </Box>
      <Box>
        Outputs Count: {cellsStore.getOutputsCount(CELL_ID)}
      </Box>
      <Box>
        Kernel State: <Label>{kernelsStore.getExecutionState(kernel.id)}</Label>
      </Box>
      <Box>
        Kernel Phase: <Label>{kernelsStore.getExecutionPhase(kernel.id)}</Label>
      </Box>
      <Box display="flex">
        <Box>
          Kernel Indicator:
        </Box>
        <Box ml={3}>
          <KernelIndicator kernel={kernel.connection}/>
        </Box>
      </Box>
      <Box>
        <Button onClick={() => cellsStore.execute(CELL_ID)}>Run cell</Button>
      </Box>
      <Cell source={DEFAULT_SOURCE} id={CELL_ID}/>
    </>
  )
}

export default CellExample;
