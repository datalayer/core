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

export type IAMTokensProps = {
  /** Route to navigate when clicking "New IAM token" button. Defaults to '/new/token'. */
  newTokenRoute?: string;
  /** Base route for the tokens list (used for edit navigation). Defaults to current relative path. */
  tokensListRoute?: string;
};

const TokensTable = ({ tokensListRoute }: { tokensListRoute?: string }) => {
  const { useTokens, useDeleteToken } = useCache();
  const { enqueueToast } = useToast();

  const getTokensQuery = useTokens();
  const deleteTokenMutation = useDeleteToken();

  const navigate = useNavigate();
  const [tokens, setTokens] = useState<IIAMToken[]>([]);
  const [deletingToken, setDeletingToken] = useState<IIAMToken | null>(null);
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (getTokensQuery.data) {
      setTokens(getTokensQuery.data);
    }
  }, [getTokensQuery.data]);
  const handleDeleteConfirm = () => {
    if (!deletingToken) return;
    deleteTokenMutation.mutate(deletingToken.id, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast(`Token "${deletingToken.name}" deleted.`, {
            variant: 'success',
          });
        } else {
          enqueueToast(resp.message || 'Failed to delete token.', {
            variant: 'error',
          });
        }
      },
      onError: () => {
        enqueueToast('Failed to delete token.', { variant: 'error' });
      },
      onSettled: () => setDeletingToken(null),
    });
  };
  return tokens.length === 0 ? (
    <Blankslate border spacious>
      <Blankslate.Heading>IAM Tokens</Blankslate.Heading>
      <Blankslate.Description>
        <Text sx={{ textAlign: 'center' }}>No IAM Tokens found.</Text>
      </Blankslate.Description>
    </Blankslate>
  ) : (
    <>
      <Table.Container>
        <Table.Title as="h2" id="tokens">
          IAM Tokens
        </Table.Title>
        <Table.Subtitle as="p" id="tokens-subtitle">
          Your tokens.
        </Table.Subtitle>
        <DataTable
          aria-labelledby="teams"
          aria-describedby="teams-subtitle"
          data={tokens}
          columns={[
            {
              header: 'Type',
              field: 'variant',
              renderCell: token => <Label>{token.variant}</Label>,
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
              renderCell: token => (
                <RelativeTime date={new Date(token.expirationDate)} />
              ),
            },
            {
              header: '',
              field: 'id',
              renderCell: token => (
                <Box display="flex" sx={{ gap: 1 }}>
                  <IconButton
                    icon={EditIcon}
                    aria-label="Edit"
                    size="small"
                    variant="invisible"
                    onClick={e =>
                      navigate(
                        tokensListRoute
                          ? `${tokensListRoute}/${token.id}`
                          : `${token.id}`,
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
                    onClick={() => setDeletingToken(token)}
                  />
                </Box>
              ),
            },
          ]}
        />
      </Table.Container>
      {deletingToken && (
        <ConfirmationDialog
          title="Delete token"
          onClose={gesture => {
            if (gesture === 'confirm') handleDeleteConfirm();
            else setDeletingToken(null);
          }}
          confirmButtonContent="Delete"
          confirmButtonType="danger"
        >
          Are you sure you want to delete the token{' '}
          <strong>{deletingToken.name}</strong>? This action cannot be undone.
        </ConfirmationDialog>
      )}
    </>
  );
};

export const IAMTokens = ({
  newTokenRoute = '/new/token',
  tokensListRoute,
}: IAMTokensProps = {}) => {
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
            <PageHeader.Title>IAM Tokens</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Actions>
            <Button
              size="small"
              variant="primary"
              onClick={e => navigate(newTokenRoute, e)}
            >
              New IAM token
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>
      <PageLayout.Content>
        <Box>
          <TokensTable tokensListRoute={tokensListRoute} />
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default IAMTokens;
