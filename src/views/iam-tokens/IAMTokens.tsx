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
  RelativeTime,
} from '@primer/react';
import {
  Blankslate,
  PageHeader,
  Table,
  DataTable,
} from '@primer/react/experimental';
import { EditIcon } from '@datalayer/icons-react';
import { IIAMToken } from '../../models';
import { useCache, useNavigate } from '../../hooks';

const TokensTable = () => {
  const { useTokens } = useCache();

  const getTokensQuery = useTokens();

  const navigate = useNavigate();
  const [tokens, setTokens] = useState<IIAMToken[]>([]);
  useEffect(() => {
    if (getTokensQuery.data) {
      setTokens(getTokensQuery.data);
    }
  }, [getTokensQuery.data]);
  return tokens.length === 0 ? (
    <Blankslate border spacious>
      <Blankslate.Heading>IAM Tokens</Blankslate.Heading>
      <Blankslate.Description>
        <Text sx={{ textAlign: 'center' }}>No IAM Tokens found.</Text>
      </Blankslate.Description>
    </Blankslate>
  ) : (
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
              <IconButton
                icon={EditIcon}
                aria-label="Edit"
                size="small"
                variant="invisible"
                onClick={e => navigate(`${token.id}`, e)}
              />
            ),
          },
        ]}
      />
    </Table.Container>
  );
};

export const IAMTokens = () => {
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
              onClick={e => navigate('/new/token', e)}
            >
              New IAM token
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

export default IAMTokens;
