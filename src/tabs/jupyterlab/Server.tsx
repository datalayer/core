import { PageHeader, UnderlineNav } from '@primer/react/drafts';
import { PlusIcon, SettingsIcon } from '@datalayer/icons-react';
import { DatalayerProps } from '../../Datalayer';

const Server = (props: DatalayerProps) => {
  return (
    <>
      <PageHeader>
        <PageHeader.TitleArea>
          <PageHeader.Title>Server</PageHeader.Title>
        </PageHeader.TitleArea>
        <PageHeader.Navigation>
          <UnderlineNav aria-label="Server">
            <UnderlineNav.Item icon={PlusIcon} counter="12" aria-current="page">
              Extensions
            </UnderlineNav.Item>
            <UnderlineNav.Item counter={3} icon={SettingsIcon}>
              Settings
            </UnderlineNav.Item>
          </UnderlineNav>
        </PageHeader.Navigation>
      </PageHeader>
    </>
  )
}

export default Server;
