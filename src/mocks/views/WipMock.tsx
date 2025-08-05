/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Box, PageHeader, Flash, PageLayout } from '@primer/react';
import { ConstructionIcon } from '@datalayer/icons-react';

type Props = {
  title: string
}

export const WipMock = (props: Props) => {
  const { title } = props;
  return (
    <PageLayout
      containerWidth="full"
      padding="normal"
      style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
    >
      <PageLayout.Header>
        <PageHeader>
          <PageHeader.TitleArea variant="large">
            <PageHeader.Title>{title}</PageHeader.Title>
          </PageHeader.TitleArea>
        </PageHeader>
        <Box>
          <Flash>
            <Box>The {title} feature is being developed.</Box>
          </Flash>
        </Box>
      </PageLayout.Header>
      <PageLayout.Content>
        <ConstructionIcon size={200} />
      </PageLayout.Content>
    </PageLayout>
  );
};

export default WipMock;
