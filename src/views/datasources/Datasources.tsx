/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect } from 'react';
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
import { IDatasource } from '../../models';
import { useCache, useNavigate } from '../../hooks';
import { DATASOURCES_MOCK } from './DatasourcesMock';

export type DatasourcesProps = {
  /** Route to navigate when clicking "New datasource" button. Defaults to '/new/datasource'. */
  newDatasourceRoute?: string;
  /** Base route for the datasources list (used for edit navigation). Defaults to current relative path. */
  datasourcesListRoute?: string;
  /** Optional principal uid used to scope datasource reads. */
  principalUid?: string;
  /** Optional principal kind used to scope datasource reads. */
  principalKind?: 'personal' | 'organization' | 'team';
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

const DatasourcesTable = ({
  datasources,
  datasourcesListRoute,
  mock = false,
}: {
  datasources: IDatasource[];
  datasourcesListRoute?: string;
  mock?: boolean;
}) => {
  const navigate = useNavigate();
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
        aria-labelledby="datasources"
        aria-describedby="datasources-subtitle"
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
                aria-label={`Edit ${datasource.name}`}
                size="small"
                variant="invisible"
                disabled={mock}
                onClick={e => {
                  if (!mock) {
                    navigate(
                      datasourcesListRoute
                        ? `${datasourcesListRoute}/${datasource.id}`
                        : `${datasource.id}`,
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
  principalUid,
  principalKind,
  showInlineLoadingIndicator = true,
}: {
  datasourcesListRoute?: string;
  principalUid?: string;
  principalKind?: 'personal' | 'organization' | 'team';
  showInlineLoadingIndicator?: boolean;
}) => {
  const { useDatasources } = useCache();

  const datasourcesQuery = useDatasources({ principalUid, principalKind });

  const [datasources, setDatasources] = useState<IDatasource[]>([]);

  const showInitialSpinner =
    datasources.length === 0 &&
    (datasourcesQuery.isLoading ||
      datasourcesQuery.isFetching ||
      !Array.isArray(datasourcesQuery.data));

  useEffect(() => {
    if (datasourcesQuery.data) {
      setDatasources((datasourcesQuery.data as any) || []);
    }
  }, [datasourcesQuery.data]);
  return showInitialSpinner ? (
    <Blankslate border spacious>
      {showInitialSpinner && showInlineLoadingIndicator ? (
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

export const Datasources = ({
  newDatasourceRoute = '/new/datasource',
  datasourcesListRoute,
  principalUid,
  principalKind,
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
                    Configure external data providers available to your workspaces
                    and agents.
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
              New Datasource
            </Button>
          </Box>
          {mock ? (
            <DatasourcesTable datasources={DATASOURCES_MOCK} mock />
          ) : (
            <LiveDatasourcesTable
              datasourcesListRoute={datasourcesListRoute}
              principalUid={principalUid}
              principalKind={principalKind}
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
