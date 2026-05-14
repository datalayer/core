/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect } from 'react';
import {
  PageLayout,
  Button,
  IconButton,
  Text,
  Label,
  Heading,
} from '@primer/react';
import { Blankslate, Table, DataTable } from '@primer/react/experimental';
import { DatabaseIcon } from '@primer/octicons-react';
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
      <PageLayout.Content>
        <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 3,
              flexWrap: 'wrap',
              mb: 4,
            }}
          >
            <Box>
              <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
                Datasources
              </Heading>
              <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
                Configure external data providers available to your workspaces
                and agents.
              </Text>
            </Box>
            <Button
              size="small"
              variant="primary"
              leadingVisual={DatabaseIcon}
              onClick={e => navigate(newDatasourceRoute, e)}
            >
              New datasource
            </Button>
          </Box>
          <DatasourcesTable datasourcesListRoute={datasourcesListRoute} />
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default Datasources;
