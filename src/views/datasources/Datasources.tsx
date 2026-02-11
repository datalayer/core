/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect } from 'react';
import { PageLayout, Button, IconButton, Text, Label } from '@primer/react';
import {
  Blankslate,
  PageHeader,
  Table,
  DataTable,
} from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { EditIcon } from '@datalayer/icons-react';
import { IDatasource } from '../../models';
import { useCache, useNavigate } from '../../hooks';

export type DatasourcesProps = {
  /** Route to navigate when clicking "New datasource" button. Defaults to '/new/datasource'. */
  newDatasourceRoute?: string;
  /** Base route for the datasources list (used for edit navigation). Defaults to current relative path. */
  datasourcesListRoute?: string;
};

const DatasourcesTable = ({
  datasourcesListRoute,
}: {
  datasourcesListRoute?: string;
}) => {
  const { useDatasources } = useCache();

  const datasourcesQuery = useDatasources();

  const navigate = useNavigate();
  const [datasources, setDatasources] = useState<IDatasource[]>([]);

  useEffect(() => {
    if (datasourcesQuery.data) {
      setDatasources((datasourcesQuery.data as any) || []);
    }
  }, [datasourcesQuery.data]);
  return datasources.length === 0 ? (
    <Blankslate border spacious>
      <Blankslate.Heading>Datasources</Blankslate.Heading>
      <Blankslate.Description>
        <Text sx={{ textAlign: 'center' }}>No Datasources found.</Text>
      </Blankslate.Description>
    </Blankslate>
  ) : (
    <Table.Container>
      <Table.Title as="h2" id="datasources">
        Datasources
      </Table.Title>
      <Table.Subtitle as="p" id="datasources-subtitle">
        Your datasources.
      </Table.Subtitle>
      <DataTable
        aria-labelledby="teams"
        aria-describedby="teams-subtitle"
        data={datasources}
        columns={[
          // @ts-ignore
          {
            header: 'Type',
            field: 'variant',
            renderCell: datasource => <Label>{datasource.variant}</Label>,
          },
          {
            header: 'Name',
            field: 'name',
            rowHeader: true,
          },
          {
            header: 'Description',
            field: 'description',
          },
          {
            header: '',
            field: 'id',
            renderCell: datasource => (
              <IconButton
                icon={EditIcon}
                aria-label="Edit"
                size="small"
                variant="invisible"
                onClick={e =>
                  navigate(
                    datasourcesListRoute
                      ? `${datasourcesListRoute}/${datasource.id}`
                      : `${datasource.id}`,
                    e,
                  )
                }
              />
            ),
          },
        ]}
      />
    </Table.Container>
  );
};

export const Datasources = ({
  newDatasourceRoute = '/new/datasource',
  datasourcesListRoute,
}: DatasourcesProps = {}) => {
  const navigate = useNavigate();
  return (
    <PageLayout
      containerWidth="full"
      padding="normal"
      style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
    >
      <PageLayout.Header>
        <PageHeader>
          <PageHeader.TitleArea variant="large">
            <PageHeader.Title>Datasources</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Actions>
            <Button
              size="small"
              variant="primary"
              onClick={e => navigate(newDatasourceRoute, e)}
            >
              New datasource
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>
      <PageLayout.Content>
        <Box>
          <DatasourcesTable datasourcesListRoute={datasourcesListRoute} />
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default Datasources;
