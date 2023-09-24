import { Box } from '@primer/react';
import { PageHeader } from '@primer/react/drafts';
import { JupyterFrontEndProps } from '../../Datalayer';

const IPyWidgets = (props: JupyterFrontEndProps) => {
  return (
    <Box>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>IPyWidgets</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
    </Box>
  )
}

export default IPyWidgets;
