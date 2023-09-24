import { Box } from '@primer/react';
import { PageHeader } from '@primer/react/drafts';
import { JupyterFrontEndProps } from '../../Datalayer';

const Settings = (props: JupyterFrontEndProps) => {
  return (
    <Box>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Settings</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
    </Box>
  )
}

export default Settings;
