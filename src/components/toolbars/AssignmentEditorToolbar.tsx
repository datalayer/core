/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Button, Box } from '@primer/react';
import { RepoPushIcon, PlayIcon, StopIcon } from '@primer/octicons-react';
import { notebookStore } from '@datalayer/jupyter-react';
import { useGradeStore } from '../../state';

export const AssignmentEditorToolbar = (props: { notebookId: string }) => {
  const { notebookId } = props;
  const { grade } = useGradeStore();
  const notebook = notebookStore.getState().selectNotebook(notebookId);
  return (
    <Box display="flex">
      <Box>
        <Button
          variant="invisible"
          size="small"
          leadingVisual={RepoPushIcon}
          onClick={() => grade(new Date())}
          >
            Grade
        </Button>
      </Box>
      {notebook?.kernelStatus !== 'busy' &&
        <Box>
          <Button
            variant="invisible"
            size="small"
            leadingVisual={PlayIcon}
            onClick={e => notebookStore.getState().runAll(notebookId)}
            >
              Run all
          </Button>
        </Box>
      }
      {notebook?.kernelStatus === 'busy' &&
        <Box>
          <Button
            variant="danger"
            size="small"
            leadingVisual={StopIcon}
            onClick={e => notebookStore.getState().interrupt(notebookId)}
            >
              Interrupt
          </Button>
        </Box>
      }
    </Box>
  )
}

export default AssignmentEditorToolbar;
