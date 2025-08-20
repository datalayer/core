/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect, useMemo } from 'react';
import { Box, Checkbox, FormControl, Heading } from '@primer/react';
import { INotebookContent } from '@jupyterlab/nbformat';
import { ServiceManager } from '@jupyterlab/services';
import {
  loadJupyterConfig,
  JupyterReactTheme,
  Notebook2,
} from '@datalayer/jupyter-react';
import { DatalayerCollaborationProvider } from '../collaboration/DatalayerCollaborationProvider';
import { createDatalayerServiceManager } from '../services/DatalayerServiceManager';
import { useDatalayerStore } from '../state/DatalayerState';

import nbformatExample from './notebooks/NotebookExample1.ipynb.json';

// This corresponds to the notebook ID in the URL when you open an existing notbook in your library
const NOTEBOOK_ID = '01JZQRQ35GG871QQCZW9TB1A8J';

/**
 * Example demonstrating how to use Datalayer services with Notebook
 * 
 * This example shows:
 * 1. How to create and use DatalayerServiceManager for kernel management
 * 2. How to create and use DatalayerCollaborationProvider for real-time collaboration
 * 3. How to enable/disable Datalayer collaboration
 * 4. How to pass these to the base Notebook component
 * 5. Graceful fallback when Datalayer credentials are not available
 */
type IDatalayerNotebookExampleProps = {
  serviceManager?: ServiceManager.IManager;
}

const DatalayerNotebookExample = (props: IDatalayerNotebookExampleProps) => {
  // Load config on component mount
  loadJupyterConfig();
  
  const [nbformat] = useState(nbformatExample as INotebookContent);
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  const [readonly] = useState(false);
  const [serviceManager, setServiceManager] = useState<ServiceManager.IManager | undefined>(props.serviceManager);
  
  const datalayerConfig = useDatalayerStore(state => state.datalayerConfig);
  
  useEffect(() => {
    // Create DatalayerServiceManager if not provided
    const createManager = async () => {
      if (props.serviceManager) {
        // Use provided service manager (should be DatalayerServiceManager from main.tsx)
        // Wait for it to be ready
        await props.serviceManager.ready;
        return;
      }

      // Create DatalayerServiceManager if we have credentials
      if (datalayerConfig?.token && datalayerConfig?.runUrl) {
        try {
          console.log('Creating DatalayerServiceManager for Datalayer infrastructure');
          // Now we can pass undefined to use config/defaults
          const manager = await createDatalayerServiceManager(
            datalayerConfig?.cpuEnvironment,
            datalayerConfig?.credits
          );
          await manager.ready;
          setServiceManager(manager);
        } catch (error) {
          console.error('Failed to create DatalayerServiceManager:', error);
        }
      } else {
        console.warn('Datalayer credentials not configured. Please set runUrl and token.');
      }
    };

    createManager();
  }, [props.serviceManager, datalayerConfig]);

  // Create the collaboration provider when enabled
  const collaborationProvider = useMemo(() => {
    if (!enableCollaboration) {
      return undefined;
    }

    const runUrl = datalayerConfig?.runUrl;
    const token = datalayerConfig?.token;

    if (!runUrl || !token) {
      console.warn(
        'Datalayer collaboration enabled but runUrl or token not configured. ' +
        'Please configure them in the Datalayer store or environment.'
      );
      return undefined;
    }

    // Create and return the Datalayer collaboration provider
    return new DatalayerCollaborationProvider({
      runUrl,
      token,
    });
  }, [enableCollaboration, datalayerConfig]);

  return (
    <JupyterReactTheme>
      <Box p={3}>
        <Heading as="h2" sx={{ mb: 3 }}>
          DatalayerNotebook Collaboration Example
        </Heading>
        
        <Box sx={{ mb: 3 }}>
          <FormControl>
            <Checkbox
              checked={enableCollaboration}
              onChange={(e) => setEnableCollaboration(e.target.checked)}
            />
            <FormControl.Label>
              Enable Datalayer Collaboration
            </FormControl.Label>
          </FormControl>
        </Box>
        
        {(!datalayerConfig?.runUrl || !datalayerConfig?.token) && (
          <Box sx={{ mb: 2, p: 2, bg: 'danger.subtle' }}>
            Warning: Datalayer configuration is missing. Please configure runUrl and token to use DatalayerServiceManager and collaboration features.
          </Box>
        )}
        
        {!serviceManager && (
          <Box sx={{ mb: 2, p: 2, bg: 'attention.subtle' }}>
            Note: DatalayerServiceManager is not available. Notebook functionality will be limited.
          </Box>
        )}
        
        <Box sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2 }}>
          {serviceManager ? (
            <Notebook2
              id={NOTEBOOK_ID}
              height="calc(100vh - 200px)"
              nbformat={nbformat}
              readonly={readonly}
              serviceManager={serviceManager}
              startDefaultKernel={true}
              collaborationProvider={collaborationProvider}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              Loading ServiceManager...
            </Box>
          )}
        </Box>
        
        <Box sx={{ mt: 2, fontSize: 1, color: 'fg.subtle' }}>
          <p>This example demonstrates how to use Datalayer services with Notebook:</p>
          <ul>
            <li><strong>DatalayerServiceManager:</strong> Connects to Datalayer infrastructure for kernel management</li>
            <li><strong>DatalayerCollaborationProvider:</strong> Enables real-time collaboration</li>
            <li>Both require Datalayer credentials (runUrl and token)</li>
            <li>Pass them directly to the base Notebook component</li>
            <li>No wrapper components needed - just create the services and pass them as props</li>
            <li>This shows the explicit, composable pattern for Datalayer integration</li>
          </ul>
        </Box>
      </Box>
    </JupyterReactTheme>
  );
};

export default DatalayerNotebookExample;