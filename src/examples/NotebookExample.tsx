/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { useEffect, useState, useMemo } from 'react';
import { Box } from '@datalayer/primer-addons';
import { Notebook2, Kernel, NotebookToolbar, CellSidebarExtension, CellSidebarButton, createServerSettings, getJupyterServerUrl, getJupyterServerToken } from '@datalayer/jupyter-react';
import { ServiceManager } from '@jupyterlab/services';

const NOTEBOOK_ID = 'notebook-example-1';

type INotebookExampleProps = {
  serviceManager?: ServiceManager.IManager;
}

export const NotebookExample = (props: INotebookExampleProps) => {
  const [kernel, setKernel] = useState<Kernel | undefined>();
  const [serviceManager, setServiceManager] = useState<ServiceManager.IManager | undefined>(props.serviceManager);
  
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
  
  const extensions = useMemo(() => [
    new CellSidebarExtension({ factory: CellSidebarButton })
  ], []);
  
  if (!kernel || !serviceManager) {
    return (
      <Box p={4}>
        <Box as="h1">A Jupyter Notebook</Box>
        <Box>Loading kernel and services...</Box>
      </Box>
    );
  }
  
  return (
    <>
      <Box as="h1">A Jupyter Notebook</Box>
      <Notebook2
        path="ipywidgets.ipynb"
        id={NOTEBOOK_ID}
        serviceManager={serviceManager}
        kernelId={kernel.id}
        extensions={extensions}
        Toolbar={NotebookToolbar}
      />
    </>
  )
}

export default NotebookExample;
