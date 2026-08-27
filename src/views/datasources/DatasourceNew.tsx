/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  PageLayout,
  FormControl,
  Button,
  Checkbox,
  CheckboxGroup,
  TextInput,
  Text,
  Heading,
  Textarea,
  Select,
  Flash,
  Link,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import {
  DATASOURCE_CONNECTOR_LABELS,
  DATASOURCE_OPERATIONS,
  type DataServerConfiguration,
  type DatasourceConnectorType,
  type DatasourceOperation,
} from '../../api/contents';
import {
  useCache,
  useContentSources,
  useCreateContentSource,
  useNavigate,
  useToast,
} from '../../hooks';

export type DatasourceNewProps = {
  /** Where the created Datasource is opened, as `${route}/${uid}`. Defaults to '/datasources'. */
  datasourcesListRoute?: string;
  /** Route to navigate to the secrets page. Defaults to '/secrets'. */
  secretsRoute?: string;
  /** The Space the Datasource belongs to, when created from one. */
  spaceUid?: string;
  /** Optional contextual principal summary rendered below the page intro. */
  accountPrincipal?: ReactNode;
};

const CONNECTORS: ReadonlyArray<DatasourceConnectorType> = ['athena', 'bigquery', 'sql'];

/** What the connector needs to be told, and what the field is called. */
const TARGET_LABELS: Record<DatasourceConnectorType, { endpoint: string; target: string; hint: string }> = {
  athena: {
    endpoint: 'Region or workgroup endpoint',
    target: 'Database',
    hint: 'The Glue database queries run in. The Secret holds the AWS key pair and the output bucket.',
  },
  bigquery: {
    endpoint: 'Endpoint',
    target: 'Project',
    hint: 'The Google Cloud project billed for the queries. The Secret holds the service account.',
  },
  sql: {
    endpoint: 'Endpoint',
    target: 'Database',
    hint: 'host:port of the server and the database to open. The Secret holds the user and password.',
  },
};

/**
 * Connect a Datasource: a `kind=datasource` content source.
 *
 * Everything but the credential lives in Contents. The credential is a
 * Secret reference — IAM is consulted here only to list the Secrets to pick
 * from — and a source routed through a Dataserver needs none, because the
 * gateway holds the credential in the network the database lives in.
 */
export const DatasourceNew = ({
  datasourcesListRoute = '/datasources',
  secretsRoute = '/secrets',
  spaceUid,
  accountPrincipal,
}: DatasourceNewProps = {}) => {
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const createSource = useCreateContentSource();
  const { useSecrets } = useCache();
  const secrets = useSecrets();
  const dataservers = useContentSources({ kind: 'data-server' });
  const idempotencyKey = useRef(`contents-datasource-${crypto.randomUUID()}`);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectorType, setConnectorType] = useState<DatasourceConnectorType>('bigquery');
  const [endpoint, setEndpoint] = useState('');
  const [target, setTarget] = useState('');
  const [route, setRoute] = useState<'direct' | 'dataserver'>('direct');
  const [credentialUid, setCredentialUid] = useState('');
  const [dataServerUid, setDataServerUid] = useState('');
  const [operations, setOperations] = useState<DatasourceOperation[]>(['select', 'describe', 'list']);
  const [rowLimit, setRowLimit] = useState('10000');
  const [maxBytes, setMaxBytes] = useState('');
  const [maxSeconds, setMaxSeconds] = useState('60');

  const labels = TARGET_LABELS[connectorType];
  const dataserverOptions = useMemo(
    () =>
      (dataservers.data?.items ?? []).map(item => {
        const configuration = item.source.configuration as DataServerConfiguration;
        return {
          uid: item.source.uid,
          name: item.source.name,
          state: configuration.state ?? (configuration.lastHeartbeatAt ? 'ready' : 'registering'),
        };
      }),
    [dataservers.data],
  );
  const numberOrUndefined = (value: string): number | undefined => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };
  const nameValid = name.trim().length > 2;
  const credentialValid = route === 'dataserver' ? Boolean(dataServerUid) : Boolean(credentialUid);
  const canSubmit =
    nameValid && credentialValid && operations.length > 0 && !createSource.isPending;

  const toggleOperation = (operation: DatasourceOperation, checked: boolean) =>
    setOperations(current =>
      checked
        ? DATASOURCE_OPERATIONS.filter(item => item === operation || current.includes(item))
        : current.filter(item => item !== operation),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    try {
      const created = await createSource.mutateAsync({
        source: {
          name: name.trim(),
          description: description.trim() || null,
          spaceUid,
          kind: 'datasource',
          capabilities: ['query'],
          credentialUid: route === 'direct' ? credentialUid : null,
          configuration: {
            kind: 'datasource',
            connectorType,
            endpoint: endpoint.trim() || null,
            databaseOrProject: target.trim() || null,
            credentialUid: route === 'direct' ? credentialUid : null,
            networkRoute: route,
            dataServerUid: route === 'dataserver' ? dataServerUid : null,
            allowedOperations: operations,
            defaultRowLimit: numberOrUndefined(rowLimit),
            maxBytes: numberOrUndefined(maxBytes),
            maxSeconds: numberOrUndefined(maxSeconds),
          },
        },
        idempotencyKey: idempotencyKey.current,
      });
      enqueueToast('Datasource connected.', { variant: 'success' });
      navigate(`${datasourcesListRoute}/${created.value.source.uid}`);
    } catch {
      // The error is shown under the form; the idempotency key makes a retry safe.
    }
  };

  return (
    <PageLayout
      containerWidth="full"
      padding="normal"
      style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
    >
      <PageLayout.Content>
        <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
          <Box sx={{ mb: 4 }}>
            <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
              Connect a Datasource
            </Heading>
            <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
              A database, warehouse or query service your notebooks and agents
              query through Datalayer. The credential stays in Vault; a query
              receives a short-lived, scoped connection.
            </Text>
            {accountPrincipal && <Box sx={{ mt: 2 }}>{accountPrincipal}</Box>}
          </Box>
          <Box as="form" onSubmit={submit} sx={{ display: 'grid', gap: 3 }}>
            <FormControl required>
              <FormControl.Label>Connector</FormControl.Label>
              <Select
                value={connectorType}
                onChange={event => setConnectorType(event.target.value as DatasourceConnectorType)}
              >
                {CONNECTORS.map(connector => (
                  <Select.Option key={connector} value={connector}>
                    {DATASOURCE_CONNECTOR_LABELS[connector]}
                  </Select.Option>
                ))}
              </Select>
              <FormControl.Caption>{labels.hint}</FormControl.Caption>
            </FormControl>
            <FormControl required>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput block value={name} onChange={event => setName(event.target.value)} autoFocus />
              {name.length > 0 && !nameValid && (
                <FormControl.Validation variant="error">
                  Name must have more than 2 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <FormControl>
              <FormControl.Label>Description</FormControl.Label>
              <Textarea block value={description} onChange={event => setDescription(event.target.value)} />
            </FormControl>
            <FormControl>
              <FormControl.Label>{labels.endpoint}</FormControl.Label>
              <TextInput
                block
                monospace
                value={endpoint}
                placeholder={connectorType === 'sql' ? 'warehouse.internal:5432' : ''}
                onChange={event => setEndpoint(event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormControl.Label>{labels.target}</FormControl.Label>
              <TextInput block monospace value={target} onChange={event => setTarget(event.target.value)} />
            </FormControl>
            <FormControl required>
              <FormControl.Label>Network route</FormControl.Label>
              <Select value={route} onChange={event => setRoute(event.target.value as 'direct' | 'dataserver')}>
                <Select.Option value="direct">Direct — Datalayer reaches the endpoint</Select.Option>
                <Select.Option value="dataserver">Through a Dataserver in your network</Select.Option>
              </Select>
              <FormControl.Caption>
                A private endpoint is reached through a Dataserver, which holds
                the credential in the network the database lives in.
              </FormControl.Caption>
            </FormControl>
            {route === 'direct' ? (
              <FormControl required>
                <FormControl.Label>Credential</FormControl.Label>
                <Select value={credentialUid} onChange={event => setCredentialUid(event.target.value)}>
                  <Select.Option value="">Choose a Secret…</Select.Option>
                  {((secrets.data as Array<{ id: string; name: string }> | undefined) ?? []).map(secret => (
                    <Select.Option key={secret.id} value={secret.id}>
                      {secret.name}
                    </Select.Option>
                  ))}
                </Select>
                <FormControl.Caption>
                  Held in Vault and resolved server-side for each query; never
                  handed to notebook code. Add one under{' '}
                  <Link
                    href={secretsRoute}
                    onClick={event => {
                      event.preventDefault();
                      navigate(secretsRoute, event);
                    }}
                  >
                    Secrets
                  </Link>
                  .
                </FormControl.Caption>
              </FormControl>
            ) : (
              <FormControl required>
                <FormControl.Label>Dataserver</FormControl.Label>
                <Select value={dataServerUid} onChange={event => setDataServerUid(event.target.value)}>
                  <Select.Option value="">Choose a Dataserver…</Select.Option>
                  {dataserverOptions.map(option => (
                    <Select.Option key={option.uid} value={option.uid}>
                      {option.name} ({option.state})
                    </Select.Option>
                  ))}
                </Select>
                <FormControl.Caption>
                  {dataserverOptions.length === 0
                    ? 'No Dataserver is registered yet; register one under Dataservers first.'
                    : 'The gateway that reaches the endpoint. Contents routes to it only while it is online.'}
                </FormControl.Caption>
              </FormControl>
            )}
            <CheckboxGroup>
              <CheckboxGroup.Label>Allowed operations</CheckboxGroup.Label>
              {DATASOURCE_OPERATIONS.map(operation => (
                <FormControl key={operation}>
                  <Checkbox
                    value={operation}
                    checked={operations.includes(operation)}
                    onChange={event => toggleOperation(operation, event.target.checked)}
                  />
                  <FormControl.Label sx={{ textTransform: 'capitalize' }}>{operation}</FormControl.Label>
                </FormControl>
              ))}
              <CheckboxGroup.Caption>
                The service refuses any statement outside this list before a
                query exists. Writes are never allowed through a Datasource.
              </CheckboxGroup.Caption>
            </CheckboxGroup>
            <Box sx={{ display: 'grid', gridTemplateColumns: ['1fr', 'repeat(3, minmax(0, 1fr))'], gap: 3 }}>
              <FormControl>
                <FormControl.Label>Default row limit</FormControl.Label>
                <TextInput block type="number" min={1} value={rowLimit} onChange={event => setRowLimit(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormControl.Label>Max bytes</FormControl.Label>
                <TextInput block type="number" min={1} value={maxBytes} placeholder="Unlimited" onChange={event => setMaxBytes(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormControl.Label>Max seconds</FormControl.Label>
                <TextInput block type="number" min={1} value={maxSeconds} onChange={event => setMaxSeconds(event.target.value)} />
              </FormControl>
            </Box>
            {createSource.isError && (
              <Flash variant="danger">{createSource.error.message}</Flash>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button type="button" onClick={event => navigate(datasourcesListRoute, event)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!canSubmit}>
                {createSource.isPending ? 'Connecting…' : 'Connect Datasource'}
              </Button>
            </Box>
          </Box>
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default DatasourceNew;
