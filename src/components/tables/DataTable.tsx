/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import { Box, Button, PageLayout } from '@primer/react';
import { Dialog } from '@primer/react/experimental';

type IDataTableProps = {
  data: Array<any>;
}

const DataTableDetails = (props: IDataTableProps) => {
  return (
    <PageLayout
      containerWidth="full"
      padding="normal"
      sx={{ overflow: 'visible' }}
    >
      <PageLayout.Content>
    </PageLayout.Content>
  </PageLayout>
  )
}

export const DataTable = (props: IDataTableProps) => {
  const [dialog, setDialog] = useState(false);
  return (
    <>
      <Box>
        {dialog ?
          <Dialog sx={{width: "100%", height: '100%'}} onClose={e => setDialog(false)}>
            <DataTableDetails {...props}/>
          </Dialog>
        :
          <DataTableDetails {...props}/>
        }
      </Box>
      <Box>
        <Button onClick={e => setDialog(true)}>
          Zoom
        </Button>
      </Box>
    </>
  )
}

export default DataTable;
