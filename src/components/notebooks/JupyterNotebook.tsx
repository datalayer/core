/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box } from "@datalayer/primer-addons";
import { BoxPanel } from '@lumino/widgets';
import { Lumino } from '@datalayer/jupyter-react';

type IJupyterNotebooProps = {
  boxPanel: BoxPanel;
  height?: string;
}

export const JupyterNotebook = (props: IJupyterNotebooProps) => {
  const { boxPanel, height } = props;
  return (
    <div style={{ position: 'relative' }}>
      <Box
        className="jp-LabShell"
        sx={{
          position: 'relative',
          '& .dla-Jupyter-Notebook': {
            height,
            maxHeight: 1000,
            width: '100%'
          },
          '& .jp-MainAreaWidget': {
            width: '100%',
            height,
          },
          '& .jp-Toolbar': {
            width: '100% !important'
          },
          '& .jp-NotebookPanel-notebook': {
            width: '100% !important',
            height,
          },
          '& .lm-mod-hidden': {
            display: 'unset !important'
          }
        }}
      >
        <Lumino>{boxPanel}</Lumino>
      </Box>
    </div>
  );
}

JupyterNotebook.defaultProps = {
  height: '100%',
}

export default JupyterNotebook;
