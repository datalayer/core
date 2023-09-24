import { Box } from '@primer/react';
import { PageHeader } from '@primer/react/drafts';
import { DatalayerProps } from '../../Datalayer';

const Settings = (props: DatalayerProps) => {
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
