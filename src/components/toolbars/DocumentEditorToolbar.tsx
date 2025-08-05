/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Button, Box } from '@primer/react';
import { RepoPushIcon } from '@primer/octicons-react';
import { documentStore } from '../../state';

export const DocumentEditorToolbar = () => {
  return (
    <Box display="flex">
      <Box>
        <Button
          variant="invisible"
          size="small"
          leadingVisual={RepoPushIcon}
          onClick={() => documentStore.getState().save(new Date())}
          >
            Save
        </Button>
      </Box>
    </Box>
  )
}

export default DocumentEditorToolbar;
