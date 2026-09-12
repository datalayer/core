/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMemo } from 'react';
import {
  PageLayout,
  Button,
  IconButton,
  Spinner,
  Text,
  Label,
  Heading,
} from '@primer/react';
import { Blankslate, Table, DataTable } from '@primer/react/experimental';
import { DatabaseIcon } from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import { EditIcon } from '@datalayer/icons-react';
import type { CatalogSource } from '../../api/contents';
import {
  DATASOURCE_CONNECTOR_LABELS,
  type DatasourceConfiguration,
  type DatasourceConnectorType,
} from '../../api/contents';
import { useContentSources, useNavigate } from '../../hooks';
import { DATASOURCES_MOCK } from './DatasourcesMock';

export type DatasourcesProps = {
  /** Route to navigate when clicking "New datasource" button. Defaults to '/datasources/new'. */
  newDatasourceRoute?: string;
  /** Base route for the datasources list (used for detail navigation). Defaults to the relative uid. */
  datasourcesListRoute?: string;
  /** Only the Datasources of one Space. */
  spaceUid?: string;
  /** Show local inline spinner in empty state while loading. */
  showInlineLoadingIndicator?: boolean;
  /** Render the real view with inert, invented data for documentation. */
  mock?: boolean;
  /**
   * Drawn inside a page that already has a heading and an inset of its own.
   *
   * On its own route this is a page: a frame, a centred column, a full-height
   * minimum and a title. Inside the Contents catalog all four fight the page
   * around it — the inset doubles, the column narrows past its neighbours, the
   * min-height leaves a gap under a short list, and the title names the
   * section twice.
   */
  embedded?: boolean;
};

type DatasourceRow = {
  id: string;
  uid: string;
  name: string;
  description: string;
  connector: string;
  target: string;
  route: 'direct' | 'dataserver';
  operations: string;
  status: string;
  canExecute: boolean;
};

/** What a Datasource is, in the terms the table shows. */
export const toDatasourceRow = (item: CatalogSource): DatasourceRow => {
  const configuration = item.source.configuration as DatasourceConfiguration;
  const connector = configuration.connectorType as DatasourceConnectorType;
  return {
    id: item.source.uid,
    uid: item.source.uid,
    name: item.source.name,
    description: item.source.description ?? '',
    connector: DATASOURCE_CONNECTOR_LABELS[connector] ?? configuration.connectorType,
    target: configuration.databaseOrProject ?? configuration.endpoint ?? '',
    route: configuration.networkRoute === 'dataserver' ? 'dataserver' : 'direct',
    operations: (configuration.allowedOperations ?? []).join(', '),
    status: item.source.status,
    canExecute: item.permissions.execute,
  };
};

const DatasourcesTable = ({
  datasources,
  datasourcesListRoute,
  mock = false,
}: {
  datasources: DatasourceRow[];
  datasourcesListRoute?: string;
  mock?: boolean;
}) => {
  const navigate = useNavigate();
  return datasources.length === 0 ? (
    <Blankslate border spacious>
      <Blankslate.Visual>
        <DatabaseIcon size={24} />
      </Blankslate.Visual>
      <Blankslate.Heading>Datasources</Blankslate.Heading>
      <Blankslate.Description>
        <Text sx={{ textAlign: 'center' }}>
          No Datasource yet. Connect a database, warehouse or query service
          to run governed queries from notebooks and agents.
        </Text>
      </Blankslate.Description>
    </Blankslate>
  ) : (
    <Table.Container>
      <DataTable
        aria-labelledby="datasources"
        aria-describedby="datasources-subtitle"
        data={datasources}
        columns={[
          {
            header: 'Connector',
            field: 'connector',
            renderCell: datasource => <Label>{datasource.connector}</Label>,
          },
          {
            header: 'Name',
            field: 'name',
            rowHeader: true,
          },
          {
            header: 'Database or project',
            field: 'target',
            renderCell: datasource =>
              datasource.target ? (
                <Text sx={{ fontFamily: 'mono', fontSize: 0 }}>{datasource.target}</Text>
              ) : (
                <Text sx={{ color: 'fg.muted' }}>—</Text>
              ),
          },
          {
            header: 'Route',
            field: 'route',
            renderCell: datasource => (
              <Label variant={datasource.route === 'dataserver' ? 'accent' : 'secondary'}>
                {datasource.route === 'dataserver' ? 'Dataserver' : 'Direct'}
              </Label>
            ),
          },
          {
            header: 'Operations',
            field: 'operations',
            renderCell: datasource =>
              datasource.operations ? (
                <Text sx={{ fontSize: 0 }}>{datasource.operations}</Text>
              ) : (
                <Text sx={{ color: 'fg.muted' }}>—</Text>
              ),
          },
          {
            header: 'Status',
            field: 'status',
            renderCell: datasource => (
              <Label variant={datasource.status === 'ready' ? 'success' : 'secondary'}>
                {datasource.status}
              </Label>
            ),
          },
          {
            header: '',
            field: 'id',
            renderCell: datasource => (
              <IconButton
                icon={EditIcon}
                aria-label={`Open ${datasource.name}`}
                size="small"
                variant="invisible"
                disabled={mock}
                onClick={e => {
                  if (!mock) {
                    navigate(
                      datasourcesListRoute
                        ? `${datasourcesListRoute}/${datasource.uid}`
                        : `${datasource.uid}`,
                      e,
                    );
                  }
                }}
              />
            ),
          },
        ]}
      />
    </Table.Container>
  );
};

const LiveDatasourcesTable = ({
  datasourcesListRoute,
  spaceUid,
  showInlineLoadingIndicator = true,
}: {
  datasourcesListRoute?: string;
  spaceUid?: string;
  showInlineLoadingIndicator?: boolean;
}) => {
  const datasourcesQuery = useContentSources({ kind: 'datasource', spaceUid });
  const datasources = useMemo(
    () =>
      (datasourcesQuery.data?.items ?? [])
        .map(toDatasourceRow)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [datasourcesQuery.data],
  );
  const showInitialSpinner = datasources.length === 0 && datasourcesQuery.isPending;

  if (datasourcesQuery.isError && datasources.length === 0) {
    return (
      <Blankslate border spacious>
        <Blankslate.Visual>
          <DatabaseIcon size={24} />
        </Blankslate.Visual>
        <Blankslate.Heading>Datasources could not be listed</Blankslate.Heading>
        <Blankslate.Description>
          <Text sx={{ textAlign: 'center' }}>{datasourcesQuery.error.message}</Text>
        </Blankslate.Description>
        <Blankslate.PrimaryAction onClick={() => datasourcesQuery.refetch()}>
          Try again
        </Blankslate.PrimaryAction>
      </Blankslate>
    );
  }
  return showInitialSpinner ? (
    <Blankslate border spacious>
      {showInlineLoadingIndicator ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40px',
          }}
        >
          <Spinner />
        </Box>
      ) : (
        <>
          <Blankslate.Heading>Datasources</Blankslate.Heading>
          <Blankslate.Description>
            <Text sx={{ textAlign: 'center' }}>Loading datasources...</Text>
          </Blankslate.Description>
        </>
      )}
    </Blankslate>
  ) : (
    <DatasourcesTable
      datasources={datasources}
      datasourcesListRoute={datasourcesListRoute}
    />
  );
};

/**
 * The Datasources of the Contents catalog.
 *
 * A Datasource is a `kind=datasource` content source: its connector, route,
 * limits and allowed operations live in Contents. IAM is consulted only when
 * one is created, to pick the Secret that holds its credential.
 */
export const Datasources = ({
  newDatasourceRoute = '/datasources/new',
  datasourcesListRoute,
  spaceUid,
  showInlineLoadingIndicator = true,
  mock = false,
  embedded = false,
}: DatasourcesProps = {}) => {
  const navigate = useNavigate();
  const body = (
    <Box sx={{ maxWidth: embedded ? undefined : 960, mx: 'auto', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 3,
          flexWrap: 'wrap',
          mb: embedded ? 2 : 4,
        }}
      >
        <Box>
          {!embedded && (
            <>
              <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
                Datasources
              </Heading>
              <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
                Databases, warehouses and query services your notebooks and
                agents query through Datalayer, without holding the credential.
              </Text>
            </>
          )}
        </Box>
        <Button
          size="small"
          variant="primary"
          leadingVisual={DatabaseIcon}
          disabled={mock}
          onClick={e => navigate(newDatasourceRoute, e)}
        >
          Connect Datasource
        </Button>
      </Box>
      {mock ? (
        <DatasourcesTable datasources={DATASOURCES_MOCK.map(toDatasourceRow)} mock />
      ) : (
        <LiveDatasourcesTable
          datasourcesListRoute={datasourcesListRoute}
          spaceUid={spaceUid}
          showInlineLoadingIndicator={showInlineLoadingIndicator}
        />
      )}
    </Box>
  );
  if (embedded) {
    return body;
  }
  return (
    <PageLayout
      containerWidth="full"
      padding="normal"
      style={{
        overflow: 'visible',
        minHeight: mock ? undefined : 'calc(100vh - 45px)',
      }}
    >
      <PageLayout.Content>{body}</PageLayout.Content>
    </PageLayout>
  );
};

export default Datasources;
