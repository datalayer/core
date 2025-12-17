/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState, useEffect } from 'react';
import { PageLayout, Button, IconButton, Text, Label } from '@primer/react';
import {
  Blankslate,
  PageHeader,
  Table,
  DataTable,
} from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { EditIcon } from '@datalayer/icons-react';
import { ISecret } from '../../models';
import { useCache, useNavigate } from '../../hooks';

const SecretsTable = () => {
  const { useSecrets } = useCache();

  const secretsQuery = useSecrets();

  const navigate = useNavigate();
  const [secrets, setSecrets] = useState<ISecret[]>([]);

  useEffect(() => {
    if (secretsQuery.data) {
      setSecrets((secretsQuery.data as any) || []);
    }
  }, [secretsQuery.data]);
  return secrets.length === 0 ? (
    <Blankslate border spacious>
      <Blankslate.Heading>Secrets</Blankslate.Heading>
      <Blankslate.Description>
        <Text sx={{ textAlign: 'center' }}>No Secrets found.</Text>
      </Blankslate.Description>
    </Blankslate>
  ) : (
    <Table.Container>
      <Table.Title as="h2" id="secrets">
        Secrets
      </Table.Title>
      <DataTable
        aria-labelledby="secrets"
        aria-describedby="secrets-subtitle"
        data={secrets}
        columns={[
          {
            header: 'Type',
            field: 'variant',
            renderCell: secret => <Label>{secret.variant}</Label>,
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
            renderCell: secret => (
              <IconButton
                icon={EditIcon}
                aria-label="Edit"
                size="small"
                variant="invisible"
                onClick={e => navigate(`${secret.id}`, e)}
              />
            ),
          },
        ]}
      />
    </Table.Container>
  );
};

export const Secrets = () => {
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
            <PageHeader.Title>Secrets</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Actions>
            <Button
              size="small"
              variant="primary"
              onClick={e => navigate('/new/secret', e)}
            >
              New secret
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>
      <PageLayout.Content>
        <Box>
          <SecretsTable />
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default Secrets;
