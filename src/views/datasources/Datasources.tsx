/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState, useEffect } from 'react';
import {
  PageLayout,
  Box,
  Button,
  IconButton,
  Text,
  Label,
} from '@primer/react';
import {
  Blankslate,
  PageHeader,
  Table,
  DataTable,
} from '@primer/react/experimental';
import { EditIcon } from '@datalayer/icons-react';
import { IDatasource } from '../../models';
import { useCache, useNavigate } from '../../hooks';

const DatasourcesTable = () => {
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
                onClick={e => navigate(`${datasource.id}`, e)}
              />
            ),
          },
        ]}
      />
    </Table.Container>
  );
};

export const Datasources = () => {
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
              onClick={e => navigate('/new/datasource', e)}
            >
              New datasource
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>
      <PageLayout.Content>
        <Box>
          <DatasourcesTable />
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default Datasources;
