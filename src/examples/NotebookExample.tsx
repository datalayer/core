/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { useMemo, useState, useEffect } from 'react';
import { Box } from '@datalayer/primer-addons';
import {
  Notebook2,
  Kernel,
  NotebookToolbar,
  CellSidebarExtension,
  CellSidebarButton,
} from '@datalayer/jupyter-react';
import { ServiceManager } from '@jupyterlab/services';

const NOTEBOOK_ID = 'notebook-example-1';

type INotebookExampleProps = {
  serviceManager?: ServiceManager.IManager;
};

export const NotebookExample = (props: INotebookExampleProps) => {
  const [kernel, setKernel] = useState<Kernel | undefined>();
  const { serviceManager } = props;

  useEffect(() => {
    if (serviceManager && !kernel) {
      // Create a kernel using the service manager
      const createKernel = async () => {
        try {
          // Create a kernel session
          const kernelConnection = await serviceManager.kernels.startNew({
            name: 'python3',
          });
          // Create a Kernel wrapper
          const k = new Kernel({
            kernelConnection,
            kernelName: 'python3',
          } as any);
          await k.ready;
          setKernel(k);
        } catch (error) {
          console.error('Failed to create kernel:', error);
        }
      };
      createKernel();
    }
  }, [serviceManager, kernel]);
  const extensions = useMemo(
    () => [new CellSidebarExtension({ factory: CellSidebarButton })],
    [],
  );
  if (!serviceManager || !kernel) {
    return (
      <Box as="h1">
        A Jupyter Notebook
        <div>Loading...</div>
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
  );
};

export default NotebookExample;
