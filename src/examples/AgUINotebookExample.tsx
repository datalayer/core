/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * ag-ui Notebook Example with CopilotKit Integration
 *
 * To run this example, create a .env file in the core directory with:
 * - VITE_DATALAYER_API_TOKEN: Get from https://datalayer.app/settings/iam/tokens
 * - VITE_COPILOT_KIT_API_KEY: Get from https://cloud.copilotkit.ai/dashboard
 *
 * You also will need to connect co[pilot kit to some sort of LLM Add LLM Provider API Key
 *
 * @module datalayer-core/AgUINotebookExample
 */

import React from 'react';
import { Box } from '@datalayer/primer-addons';
import { ServiceManager } from '@jupyterlab/services';
import { Notebook2 } from '@datalayer/jupyter-react';

// CopilotKit imports
import { CopilotKit, useFrontendTool } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

// Import ag-ui components and hooks
import {
  ActionRegistrar,
  useNotebookToolActions,
} from '../tools/adapters/agui/notebookHooks';

// Import Matplotlib notebook
import MatplotlibNotebook from './notebooks/Matplotlib.ipynb.json';

// Fixed notebook ID
const NOTEBOOK_ID = 'agui-notebook-example';

// Use the imported Matplotlib notebook
const NOTEBOOK_CONTENT = MatplotlibNotebook;

/**
 * Notebook UI component (without tool registration)
 */
interface NotebookUIProps {
  serviceManager?: ServiceManager.IManager;
}

const NotebookUI = React.memo(function NotebookUI({
  serviceManager,
}: NotebookUIProps): JSX.Element {
  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: 3,
        }}
      >
        <Box
          sx={{
            marginBottom: 3,
            paddingBottom: 3,
            borderBottom: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <h1>ag-ui Notebook Example</h1>
          <p>Platform-agnostic tool usage with CopilotKit integration.</p>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            padding: 3,
            backgroundColor: 'canvas.default',
          }}
        >
          {serviceManager ? (
            <Notebook2
              nbformat={NOTEBOOK_CONTENT}
              id={NOTEBOOK_ID}
              serviceManager={serviceManager}
              height="600px"
              cellSidebarMargin={120}
              startDefaultKernel={true}
            />
          ) : (
            <Box sx={{ padding: 3 }}>
              <p>Loading service manager...</p>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
});

/**
 * Component to register actions with CopilotKit.
 * Must be inside CopilotKit context.
 */
function NotebookActions() {
  // Create notebook tool actions (stable reference)
  const actions = useNotebookToolActions(NOTEBOOK_ID);
  return (
    <>
      {/* Register each action using a loop with ActionRegistrar component */}
      {actions.map((action, i) => (
        <ActionRegistrar
          key={action.name || i}
          action={action}
          useFrontendTool={useFrontendTool}
        />
      ))}
    </>
  );
}

/**
 * Main ag-ui notebook example component with tool registration
 * IMPORTANT: This must be inside CopilotKit context
 */
interface AgUINotebookExampleProps {
  serviceManager?: ServiceManager.IManager;
}

function AgUINotebookExample({
  serviceManager,
}: AgUINotebookExampleProps): JSX.Element {
  return (
    <CopilotKit
      showDevConsole={true}
      publicApiKey={import.meta.env.VITE_COPILOT_KIT_API_KEY}
    >
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: 'Notebook AI Copilot',
          initial: 'Hi! I can help you edit notebook cells.',
        }}
      >
        <NotebookActions />
        <NotebookUI serviceManager={serviceManager} />
      </CopilotSidebar>
    </CopilotKit>
  );
}

export default AgUINotebookExample;
