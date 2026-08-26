/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  PageLayout,
  Text,
  Button,
  TextInput,
  FormControl,
  Textarea,
  Label,
  Spinner,
  Heading,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import {
  DATASOURCE_CONNECTOR_LABELS,
  type DatasourceConfiguration,
  type DatasourceConnectorType,
} from '../../api/contents';
import { BoringAvatar } from '../../components/avatars';
import {
  useContentSource,
  useCredentialDiagnostics,
  useTestDatasource,
  useToast,
  useUpdateContentSource,
} from '../../hooks';

export type DatasourceDetailProps = {
  /** The Datasource, when not read from the `sourceUid` route parameter. */
  sourceUid?: string;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: ['1fr', '200px 1fr'], gap: 1 }}>
      <Text sx={{ color: 'fg.muted', fontSize: 1 }}>{label}</Text>
      <Box sx={{ fontSize: 1 }}>{children}</Box>
    </Box>
  );
}

const frame = (children: React.ReactNode) => (
  <PageLayout
    containerWidth="full"
    padding="normal"
    style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
  >
    <PageLayout.Content>
      <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>{children}</Box>
    </PageLayout.Content>
  </PageLayout>
);

/**
 * A Datasource's settings: what it connects to, and the name it goes by.
 *
 * The connection itself is read from Contents and never includes the
 * credential — the page shows whether one is attached and resolvable. Name,
 * description and limits are edited conditionally on the source's ETag, so
 * two people editing the same record do not overwrite each other. Running
 * queries is the Contents detail's job, not this page's.
 */
export const DatasourceDetail = ({ sourceUid: givenUid }: DatasourceDetailProps = {}) => {
  const params = useParams<{ sourceUid?: string; datasourceId?: string }>();
  const sourceUid = givenUid ?? params.sourceUid ?? params.datasourceId;
  const { enqueueToast } = useToast();
  const sourceQuery = useContentSource(sourceUid);
  const update = useUpdateContentSource();
  const test = useTestDatasource();
  const source = sourceQuery.data?.value.source;
  const configuration = source?.configuration as DatasourceConfiguration | undefined;
  const diagnostics = useCredentialDiagnostics(
    configuration?.networkRoute === 'dataserver' ? undefined : sourceUid,
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rowLimit, setRowLimit] = useState('');
  const [maxSeconds, setMaxSeconds] = useState('');

  useEffect(() => {
    if (source && configuration) {
      setName(source.name);
      setDescription(source.description ?? '');
      setRowLimit(configuration.defaultRowLimit ? String(configuration.defaultRowLimit) : '');
      setMaxSeconds(configuration.maxSeconds ? String(configuration.maxSeconds) : '');
    }
  }, [source, configuration]);

  if (!sourceUid) {
    return <></>;
  }
  if (sourceQuery.isPending) {
    return frame(
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <Spinner size="large" />
      </Box>,
    );
  }
  if (sourceQuery.isError || !source || !configuration || source.kind !== 'datasource') {
    return frame(
      <Box sx={{ p: 4 }}>
        <Text sx={{ color: 'danger.fg' }}>
          {sourceQuery.isError
            ? sourceQuery.error.message
            : 'Datasource not found, or this content is not a Datasource.'}
        </Text>
      </Box>,
    );
  }

  const permissions = sourceQuery.data.value.permissions;
  const numberOrNull = (value: string): number | null => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const nameValid = name.trim().length > 2;
  const save = () => {
    if (!nameValid) {
      return;
    }
    update.mutate(
      {
        sourceUid: source.uid,
        etag: sourceQuery.data.etag,
        update: {
          name: name.trim(),
          description: description.trim() || null,
          configuration: {
            ...configuration,
            defaultRowLimit: numberOrNull(rowLimit),
            maxSeconds: numberOrNull(maxSeconds),
          } as unknown as typeof source.configuration,
        },
      },
      {
        onSuccess: () => enqueueToast('The Datasource is updated.', { variant: 'success' }),
      },
    );
  };
  const connector = DATASOURCE_CONNECTOR_LABELS[configuration.connectorType as DatasourceConnectorType]
    ?? configuration.connectorType;

  return frame(
    <>
      <Box sx={{ mb: 4 }}>
        <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
          Datasource
        </Heading>
        <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
          The connection as Contents holds it. The credential is never shown;
          the page says whether one is attached and resolvable.
        </Text>
      </Box>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          bg: 'canvas.default',
          p: 3,
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: ['1fr', '180px 1fr'], gap: 4 }}>
          <Box>
            <BoringAvatar displayName={source.name} size={100} style={{ paddingRight: 10 }} />
            <Box mt={3}>
              <Label size="large">{connector}</Label>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Row label="Connector">
                <Text>{connector}</Text>
              </Row>
              <Row label="Route">
                <Label variant={configuration.networkRoute === 'dataserver' ? 'accent' : 'secondary'}>
                  {configuration.networkRoute === 'dataserver' ? 'Through a Dataserver' : 'Direct'}
                </Label>
                {configuration.dataServerUid && (
                  <Text sx={{ fontFamily: 'mono', fontSize: 0, ml: 2 }}>{configuration.dataServerUid}</Text>
                )}
              </Row>
              {configuration.endpoint && (
                <Row label="Endpoint">
                  <Text sx={{ fontFamily: 'mono', fontSize: 0 }}>{configuration.endpoint}</Text>
                </Row>
              )}
              {configuration.databaseOrProject && (
                <Row label={configuration.connectorType === 'bigquery' ? 'Project' : 'Database'}>
                  <Text sx={{ fontFamily: 'mono', fontSize: 0 }}>{configuration.databaseOrProject}</Text>
                </Row>
              )}
              <Row label="Allowed operations">
                <Text>{(configuration.allowedOperations ?? []).join(', ') || '—'}</Text>
              </Row>
              <Row label="Credential">
                {configuration.networkRoute === 'dataserver' ? (
                  <Text sx={{ color: 'fg.muted' }}>Held by the Dataserver, in your network.</Text>
                ) : configuration.credentialUid ? (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {diagnostics.data ? (
                      <Label variant={diagnostics.data.resolvable ? 'success' : 'danger'}>
                        {diagnostics.data.resolvable ? 'Resolvable' : 'Not resolvable'}
                      </Label>
                    ) : (
                      <Label variant="success">Attached</Label>
                    )}
                    <Text sx={{ color: 'fg.muted', fontSize: 0 }}>
                      {diagnostics.data?.credentialName ?? 'Held in Vault and resolved server-side.'}
                    </Text>
                  </Box>
                ) : (
                  <Label variant="attention">None</Label>
                )}
              </Row>
              <Row label="Connection">
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    disabled={test.isPending || !permissions.execute}
                    onClick={() => test.mutate(source.uid)}
                  >
                    {test.isPending ? 'Testing…' : 'Test connection'}
                  </Button>
                  {test.data && (
                    <>
                      <Label variant={test.data.ok ? 'success' : 'danger'}>
                        {test.data.ok ? 'Reachable' : 'Not reachable'}
                      </Label>
                      <Text sx={{ color: 'fg.muted', fontSize: 0 }}>{test.data.detail}</Text>
                    </>
                  )}
                  {test.isError && (
                    <Text sx={{ color: 'danger.fg', fontSize: 0 }}>{test.error.message}</Text>
                  )}
                </Box>
              </Row>
            </Box>
            <Box sx={{ label: { marginTop: 2 } }}>
              <FormControl>
                <FormControl.Label>Name</FormControl.Label>
                <TextInput block value={name} disabled={!permissions.update} onChange={event => setName(event.target.value)} />
                {!nameValid && (
                  <FormControl.Validation variant="error">
                    Name must have more than 2 characters.
                  </FormControl.Validation>
                )}
              </FormControl>
              <FormControl>
                <FormControl.Label>Description</FormControl.Label>
                <Textarea block rows={3} value={description} disabled={!permissions.update} onChange={event => setDescription(event.target.value)} />
              </FormControl>
              <Box sx={{ display: 'grid', gridTemplateColumns: ['1fr', '1fr 1fr'], gap: 3 }}>
                <FormControl>
                  <FormControl.Label>Default row limit</FormControl.Label>
                  <TextInput block type="number" min={1} value={rowLimit} placeholder="Service default" disabled={!permissions.update} onChange={event => setRowLimit(event.target.value)} />
                </FormControl>
                <FormControl>
                  <FormControl.Label>Max seconds</FormControl.Label>
                  <TextInput block type="number" min={1} value={maxSeconds} placeholder="Service default" disabled={!permissions.update} onChange={event => setMaxSeconds(event.target.value)} />
                </FormControl>
              </Box>
              {update.isError && (
                <Text as="p" sx={{ color: 'danger.fg' }}>{update.error.message}</Text>
              )}
              {permissions.update && (
                <Box sx={{ marginTop: 3 }}>
                  <Button variant="primary" disabled={!nameValid || update.isPending} onClick={save}>
                    {update.isPending ? 'Saving…' : 'Update Datasource'}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>,
  );
};

export default DatasourceDetail;
