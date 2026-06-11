/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect, useRef } from 'react';
import {
  PageLayout,
  Button,
  IconButton,
  Text,
  Label,
  RelativeTime,
  ConfirmationDialog,
} from '@primer/react';
import {
  Blankslate,
  PageHeader,
  Table,
  DataTable,
} from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { EditIcon } from '@datalayer/icons-react';
import { TrashIcon } from '@primer/octicons-react';
import { IIAMToken } from '../../models';
import { useCache, useNavigate, useToast } from '../../hooks';

const TokensTable = () => {
  const { useTokens, useDeleteToken } = useCache();
  const { enqueueToast } = useToast();

  const getApiKeysQuery = useTokens();
  const deleteTokenMutation = useDeleteToken();

  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<IIAMToken[]>([]);
  const [deletingToken, setDeletingToken] = useState<IIAMToken | null>(null);
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (getApiKeysQuery.data) {
      setApiKeys(getApiKeysQuery.data);
    }
  }, [getApiKeysQuery.data]);
  const handleDeleteConfirm = () => {
    if (!deletingToken) return;
    deleteTokenMutation.mutate(deletingToken.id, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast(`API key "${deletingToken.name}" deleted.`, {
            variant: 'success',
          });
        } else {
          enqueueToast(resp.message || 'Failed to delete API key.', {
            variant: 'error',
          });
        }
      },
      onError: () => {
        enqueueToast('Failed to delete API key.', { variant: 'error' });
      },
      onSettled: () => setDeletingToken(null),
    });
  };
  return apiKeys.length === 0 ? (
    <Blankslate border spacious>
      <Blankslate.Heading>API Keys</Blankslate.Heading>
      <Blankslate.Description>
        <Text sx={{ textAlign: 'center' }}>No API Keys found.</Text>
      </Blankslate.Description>
    </Blankslate>
  ) : (
    <>
      <Table.Container>
        <Table.Title as="h2" id="api-keys">
          API Keys
        </Table.Title>
        <Table.Subtitle as="p" id="api-keys-subtitle">
          Your API keys.
        </Table.Subtitle>
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
                    onClick={e => navigate(`${apiKey.id}`, e)}
                  />
                  <IconButton
                    ref={returnFocusRef}
                    icon={TrashIcon}
                    aria-label="Delete"
                    size="small"
                    variant="invisible"
                    sx={{ color: 'danger.fg' }}
                    onClick={() => setDeletingToken(apiKey)}
                  />
                </Box>
              ),
            },
          ]}
        />
      </Table.Container>
      {deletingToken && (
        <ConfirmationDialog
          title="Delete API key"
          onClose={gesture => {
            if (gesture === 'confirm') handleDeleteConfirm();
            else setDeletingToken(null);
          }}
          confirmButtonContent="Delete"
          confirmButtonType="danger"
        >
          Are you sure you want to delete the API key{' '}
          <strong>{deletingToken.name}</strong>? This action cannot be undone.
        </ConfirmationDialog>
      )}
    </>
  );
};

export const Tokens = () => {
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
            <PageHeader.Title>API Keys</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Actions>
            <Button
              size="small"
              variant="primary"
              onClick={e => navigate('/api-keys/new', e)}
            >
              New API key
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>
      <PageLayout.Content>
        <Box>
          <TokensTable />
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default Tokens;
