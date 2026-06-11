/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect, useRef } from 'react';
import {
  PageLayout,
  Button,
  IconButton,
  TextInput,
  Text,
  Label,
  RelativeTime,
} from '@primer/react';
import {
  Blankslate,
  Dialog,
  PageHeader,
  Table,
  DataTable,
} from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { EditIcon } from '@datalayer/icons-react';
import { TrashIcon } from '@primer/octicons-react';
import { IIAMToken as IAPIKey } from '../../models';
import { useCache, useNavigate, useToast } from '../../hooks';

export type APIKeysProps = {
  /** Route to navigate when clicking "New API Key" button. Defaults to '/new/api-key'. */
  newAPIKeyRoute?: string;
  /** Base route for the API keys list (used for edit navigation). Defaults to current relative path. */
  apiKeysListRoute?: string;
  /** Whether to display view titles/headings. Defaults to true. */
  showTitle?: boolean;
  /** Whether to render the "New API Key" button in this component header. Defaults to true. */
  showNewButton?: boolean;
};

const APIKeysTable = ({
  apiKeysListRoute,
  showTitle = true,
}: {
  apiKeysListRoute?: string;
  showTitle?: boolean;
}) => {
  const { useTokens: useAPIKeys, useDeleteToken: useDeleteAPIKey } = useCache();
  const { enqueueToast } = useToast();

  const getAPIKeysQuery = useAPIKeys();
  const deleteAPIKeyMutation = useDeleteAPIKey();

  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<IAPIKey[]>([]);
  const [deletingAPIKey, setDeletingAPIKey] = useState<IAPIKey | null>(null);
  const [deleteNameConfirm, setDeleteNameConfirm] = useState('');
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (getAPIKeysQuery.data) {
      const normalized = getAPIKeysQuery.data.filter(
        (apiKey): apiKey is IAPIKey => Boolean(apiKey),
      );
      setApiKeys(normalized);
    }
  }, [getAPIKeysQuery.data]);
  const confirmDeleteAPIKey = () => {
    if (!deletingAPIKey) return;
    if (deleteNameConfirm.trim() !== deletingAPIKey.name) {
      enqueueToast(
        'Please type the API key name exactly to confirm deletion.',
        {
          variant: 'error',
        },
      );
      return;
    }
    deleteAPIKeyMutation.mutate(deletingAPIKey.id, {
      onSuccess: (resp: { success?: boolean; message?: string }) => {
        if (resp?.success) {
          enqueueToast(`API key "${deletingAPIKey.name}" deleted.`, {
            variant: 'success',
          });
        } else {
          enqueueToast(resp?.message || 'Failed to delete API key.', {
            variant: 'error',
          });
        }
      },
      onError: () => {
        enqueueToast('Failed to delete API key.', { variant: 'error' });
      },
      onSettled: () => {
        setDeletingAPIKey(null);
        setDeleteNameConfirm('');
      },
    });
  };
  return apiKeys.length === 0 ? (
    <Blankslate border spacious>
      {showTitle && <Blankslate.Heading>API Keys</Blankslate.Heading>}
      <Blankslate.Description>
        <Text sx={{ textAlign: 'center' }}>No API Keys found.</Text>
      </Blankslate.Description>
    </Blankslate>
  ) : (
    <>
      <Table.Container>
        {showTitle && (
          <>
            <Table.Title as="h2" id="api-keys">
              API Keys
            </Table.Title>
            <Table.Subtitle as="p" id="api-keys-subtitle">
              Your API keys.
            </Table.Subtitle>
          </>
        )}
        <DataTable
          aria-labelledby="api-keys"
          aria-describedby="api-keys-subtitle"
          data={apiKeys}
          columns={[
            {
              header: 'Type',
              field: 'variant',
              renderCell: apiKey => <Label>{apiKey.variant}</Label>,
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
              header: 'Expiration date',
              field: 'expirationDate',
              renderCell: apiKey => (
                <RelativeTime date={new Date(apiKey.expirationDate)} />
              ),
            },
            {
              header: '',
              field: 'id',
              renderCell: apiKey => (
                <Box display="flex" sx={{ gap: 1 }}>
                  <IconButton
                    icon={EditIcon}
                    aria-label="Edit"
                    size="small"
                    variant="invisible"
                    onClick={e =>
                      navigate(
                        apiKeysListRoute
                          ? `${apiKeysListRoute}/${apiKey.id}`
                          : `${apiKey.id}`,
                        e,
                      )
                    }
                  />
                  <IconButton
                    ref={returnFocusRef}
                    icon={TrashIcon}
                    aria-label="Delete"
                    size="small"
                    variant="invisible"
                    sx={{ color: 'danger.fg' }}
                    onClick={() => {
                      setDeletingAPIKey(apiKey);
                      setDeleteNameConfirm('');
                    }}
                  />
                </Box>
              ),
            },
          ]}
        />
      </Table.Container>
      {deletingAPIKey && (
        <Dialog
          title="Delete API key"
          onClose={() => {
            setDeletingAPIKey(null);
            setDeleteNameConfirm('');
          }}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Cancel',
              onClick: () => {
                setDeletingAPIKey(null);
                setDeleteNameConfirm('');
              },
            },
            {
              buttonType: 'danger',
              content: 'Delete',
              disabled: deleteNameConfirm.trim() !== deletingAPIKey.name,
              onClick: event => {
                if (!event.defaultPrevented) {
                  event.preventDefault();
                  confirmDeleteAPIKey();
                }
              },
            },
          ]}
        >
          Are you sure you want to delete the API key{' '}
          <strong>{deletingAPIKey.name}</strong>? This action cannot be undone.
          <Text sx={{ mt: 3, display: 'block', color: 'fg.muted' }}>
            Type <strong>{deletingAPIKey.name}</strong> to confirm deletion.
          </Text>
          <TextInput
            block
            value={deleteNameConfirm}
            onChange={e => setDeleteNameConfirm(e.target.value)}
            placeholder="Retype API key name"
            sx={{ mt: 2 }}
            autoFocus
          />
        </Dialog>
      )}
    </>
  );
};

export const APIKeys = ({
  newAPIKeyRoute = '/new/api-key',
  apiKeysListRoute,
  showTitle = true,
  showNewButton = true,
}: APIKeysProps = {}) => {
  const navigate = useNavigate();
  return (
    <PageLayout
      containerWidth="full"
      padding="normal"
      style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
    >
      {showTitle || showNewButton ? (
        <PageLayout.Header>
          <PageHeader>
            {showTitle && (
              <PageHeader.TitleArea variant="large">
                <PageHeader.Title>API Keys</PageHeader.Title>
              </PageHeader.TitleArea>
            )}
            {showNewButton && (
              <PageHeader.Actions>
                <Button
                  size="small"
                  variant="primary"
                  onClick={e => navigate(newAPIKeyRoute, e)}
                >
                  New API Key
                </Button>
              </PageHeader.Actions>
            )}
          </PageHeader>
        </PageLayout.Header>
      ) : null}
      <PageLayout.Content>
        <Box>
          <APIKeysTable
            apiKeysListRoute={apiKeysListRoute}
            showTitle={showTitle}
          />
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default APIKeys;
