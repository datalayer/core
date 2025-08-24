import React, { useState, useEffect, useMemo } from 'react';
import { Box, Heading, Text, Checkbox, FormControl } from '@primer/react';
import { INotebookContent } from '@jupyterlab/nbformat';
import { ServiceManager } from '@jupyterlab/services';
import { Notebook2 } from '@datalayer/jupyter-react';
import {
  createDatalayerServiceManager,
  DatalayerCollaborationProvider,
  useCoreStore,
} from '@datalayer/core';

// Sample notebook content
const SAMPLE_NOTEBOOK: INotebookContent = {
  cells: [
    {
      cell_type: 'markdown',
      metadata: {},
      source: [
        '# Welcome to Datalayer Electron Example\n',
        '\n',
        'This notebook demonstrates the integration of Datalayer SDK with Electron.\n',
        '\n',
        'You can:\n',
        '- Execute Python code\n',
        '- Use Datalayer cloud infrastructure\n',
        '- Enable real-time collaboration\n',
      ],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        'import sys\nprint(f"Python {sys.version}")\nprint("Running in Datalayer Electron!")',
      ],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        '# Try some computation\nimport numpy as np\n\n# Create a random matrix\nmatrix = np.random.rand(3, 3)\nprint("Random Matrix:")\nprint(matrix)\nprint(f"\\nMatrix sum: {matrix.sum():.2f}")',
      ],
    },
    {
      cell_type: 'markdown',
      metadata: {},
      source: ['## Data Visualization\n\nYou can also create visualizations:'],
    },
    {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        'import matplotlib.pyplot as plt\nimport numpy as np\n\n# Generate data\nx = np.linspace(0, 10, 100)\ny = np.sin(x)\n\n# Create plot\nplt.figure(figsize=(10, 6))\nplt.plot(x, y, label="sin(x)")\nplt.plot(x, np.cos(x), label="cos(x)")\nplt.xlabel("x")\nplt.ylabel("y")\nplt.title("Trigonometric Functions")\nplt.legend()\nplt.grid(True)\nplt.show()',
      ],
    },
  ],
  metadata: {
    kernelspec: {
      display_name: 'Python 3',
      language: 'python',
      name: 'python3',
    },
    language_info: {
      name: 'python',
      version: '3.11.0',
    },
  },
  nbformat: 4,
  nbformat_minor: 5,
};

const NotebookView: React.FC = () => {
  const [serviceManager, setServiceManager] = useState<
    ServiceManager.IManager | undefined
  >();
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [loading, setLoading] = useState(true);
  const { configuration } = useCoreStore();

  useEffect(() => {
    const initServiceManager = async () => {
      if (configuration?.token && configuration?.runUrl) {
        try {
          console.log('Creating DatalayerServiceManager...');
          const manager = await createDatalayerServiceManager(
            configuration.cpuEnvironment || 'python-3.11',
            configuration.credits || 100
          );
          await manager.ready;
          setServiceManager(manager);
          console.log('DatalayerServiceManager ready');
        } catch (error) {
          console.error('Failed to create DatalayerServiceManager:', error);
        }
      } else {
        console.log('No Datalayer credentials configured');
      }
      setLoading(false);
    };

    initServiceManager();
  }, [configuration]);

  const collaborationProvider = useMemo(() => {
    if (
      !enableCollaboration ||
      !configuration?.runUrl ||
      !configuration?.token
    ) {
      return undefined;
    }

    return new DatalayerCollaborationProvider({
      runUrl: configuration.runUrl,
      token: configuration.token,
    });
  }, [enableCollaboration, configuration]);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Text>Loading notebook environment...</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Heading as="h2" sx={{ mb: 2 }}>
          Jupyter Notebook
        </Heading>
        <Text sx={{ color: 'fg.subtle', mb: 3 }}>
          Interactive notebook environment powered by Datalayer
        </Text>

        {configuration?.token && (
          <FormControl>
            <Checkbox
              checked={enableCollaboration}
              onChange={e => setEnableCollaboration(e.target.checked)}
            />
            <FormControl.Label>
              Enable Real-time Collaboration
            </FormControl.Label>
          </FormControl>
        )}
      </Box>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          overflow: 'hidden',
          height: 'calc(100vh - 280px)',
        }}
      >
        {serviceManager ? (
          <Notebook2
            id="electron-example-notebook"
            height="100%"
            nbformat={SAMPLE_NOTEBOOK}
            readonly={false}
            serviceManager={serviceManager}
            startDefaultKernel={true}
            collaborationProvider={collaborationProvider}
          />
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', bg: 'canvas.subtle' }}>
            <Text sx={{ color: 'fg.muted' }}>
              Service manager not available. Please configure Datalayer
              credentials.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NotebookView;
