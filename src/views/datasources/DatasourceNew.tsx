/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useEffect, useState } from 'react';
import {
  PageHeader,
  FormControl,
  Button,
  TextInput,
  Text,
  Textarea,
  Select,
  Flash,
  Link,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useCache, useNavigate, useToast } from '../../hooks';
import { IDatasourceVariant } from '../../models';
import { useRunStore } from '../../state';

interface FormData {
  variant: IDatasourceVariant;
  database?: string;
  outputBucket?: string;
  name?: string;
  description?: string;
}

interface ValidationData {
  variant?: boolean;
  database?: boolean;
  outputBucket?: boolean;
  name?: boolean;
  description?: boolean;
}

export const DatasourceNew = () => {
  const runStore = useRunStore();
  const { useCreateDatasource } = useCache();

  const createDatasourceMutation = useCreateDatasource();

  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const [formValues, setFormValues] = useState<FormData>({
    variant: 'athena',
    database: undefined,
    outputBucket: undefined,
    name: undefined,
    description: undefined,
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    variant: undefined,
    database: undefined,
    outputBucket: undefined,
    name: undefined,
    description: undefined,
  });
  const valueVariantChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      variant: event.target.value as IDatasourceVariant,
    }));
  };
  const valueDatabaseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      database: event.target.value,
    }));
  };
  const valueOutputBucketChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      outputBucket: event.target.value,
    }));
  };
  const valueNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      name: event.target.value,
    }));
  };
  const valueDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      description: event.target.value,
    }));
  };
  useEffect(() => {
    setValidationResult({
      ...validationResult,
      name:
        formValues.name === undefined
          ? undefined
          : formValues.name.length > 2
            ? true
            : false,
      description:
        formValues.description === undefined
          ? undefined
          : formValues.description.length > 2
            ? true
            : false,
      database:
        formValues.variant !== 'athena'
          ? true
          : formValues.database === undefined
            ? undefined
            : formValues.database.length > 0
              ? true
              : false,
      outputBucket:
        formValues.variant !== 'athena'
          ? true
          : formValues.outputBucket === undefined
            ? undefined
            : formValues.outputBucket.length > 0
              ? true
              : false,
    });
  }, [formValues]);
  const submitCreate = () => {
    runStore.layout().showBackdrop('Creating an datasource...');
    createDatasourceMutation.mutate(
      {
        name: formValues.name!,
        variant: formValues.variant,
        database: formValues.database ?? '',
        outputBucket: formValues.outputBucket ?? '',
        description: formValues.description!,
      },
      {
        onSuccess: (resp: any) => {
          if (resp.success) {
            enqueueToast(resp.message, { variant: 'success' });
            navigate(`/settings/integrations/datasources`);
          }
        },
        onSettled: () => {
          runStore.layout().hideBackdrop();
        },
      },
    );
  };
  return (
    <Box>
      <PageHeader>
        <PageHeader.TitleArea variant="large">
          <PageHeader.Title>New Datasource</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      <Flash variant="warning">
        {formValues.variant === 'athena' && (
          <Text>
            For <Link href="https://aws.amazon.com/athena">Amazon Athena</Link>,
            ensure the following{' '}
            <Link
              href="javascript: return false;"
              onClick={e => navigate('/settings/iam/secrets', e)}
            >
              Secrets
            </Link>{' '}
            are available:{'  '}
            <Text as="code">AWS_SECRET_ACCESS_KEY</Text>
            {'  '}
            <Text as="code">AWS_ACCESS_KEY_ID</Text>
            {'  '}
            <Text as="code">AWS_DEFAULT_REGION</Text>
          </Text>
        )}
        {formValues.variant === 'bigquery' && (
          <Text>
            For{' '}
            <Link href="https://cloud.google.com/bigquery">
              Google Big Query
            </Link>
            , ensure the following{' '}
            <Link
              href="javascript: return false;"
              onClick={e => navigate('/settings/iam/secrets', e)}
            >
              Secret
            </Link>{' '}
            is available:{'  '}
            <Text as="code">GOOGLE_APPLICATION_CREDENTIALS</Text>
          </Text>
        )}
        {formValues.variant === 'mssentinel' && (
          <Text>
            For{' '}
            <Link href="https://learn.microsoft.com/en-us/azure/sentinel/overview?tabs=defender-portaly">
              Microsoft Sentinel
            </Link>
            , ensure the following{' '}
            <Link
              href="javascript: return false;"
              onClick={e => navigate('/settings/iam/secrets', e)}
            >
              Secret
            </Link>{' '}
            is available:{'  '}
            <Text as="code">AZURE_TENANT_ID</Text>
            {` `}
            <Text as="code">AZURE_CLIENT_ID</Text>
            {` `}
            <Text as="code">AZURE_CLIENT_SECRET</Text>
            {` `}
            <Text as="code">AZURE_SUBSCRIPTION_ID</Text>
            {` `}
            <Text as="code">AZURE_RESOURCE_GROUP</Text>
            {` `}
            <Text as="code">MSSENTINEL_WORKSPACE_ID</Text>
            {` `}
            <Text as="code">MSSENTINEL_WORKSPACE_NAME</Text>
          </Text>
        )}
        {formValues.variant === 'splunk' && (
          <Text>
            For <Link href="https://www.splunk.com/">Splunk</Link>, ensure the
            following{' '}
            <Link
              href="javascript: return false;"
              onClick={e => navigate('/settings/iam/secrets', e)}
            >
              Secret
            </Link>{' '}
            is available:{'  '}
            <Text as="code">SPLUNK_HOST</Text>
            {` `}
            <Text as="code">SPLUNK_PORT</Text>
            {` `}
            <Text as="code">SPLUNK_USERNAME</Text>
            {` `}
            <Text as="code">SPLUNK_PASSWORD</Text>
          </Text>
        )}
      </Flash>
      <Box display="grid" gridTemplateColumns="1fr 1fr" sx={{ gap: 3 }}>
        <Box>
          <Box sx={{ label: { marginTop: 2 } }}>
            <FormControl required>
              <FormControl.Label>Datasource type</FormControl.Label>
              <Select
                name="type"
                value={formValues.variant}
                onChange={valueVariantChange}
              >
                <Select.Option value="athena">Amazon Athena</Select.Option>
                <Select.Option value="bigquery">Google BigQuery</Select.Option>
                <Select.Option value="mssentinel">
                  Microsoft Sentinel
                </Select.Option>
                <Select.Option value="splunk">Splunk</Select.Option>
              </Select>
              <FormControl.Caption>
                Pick the most appropriate datasource type.
              </FormControl.Caption>
            </FormControl>
            <FormControl required>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput
                block
                value={formValues.name}
                onChange={valueNameChange}
                autoFocus
              />
              <FormControl.Caption>
                Hint: The datasource name is a short name that identifies in a
                unique way your datasource.
              </FormControl.Caption>
              {validationResult.name === false && (
                <FormControl.Validation variant="error">
                  Name length must be between 2 and 32 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            {formValues.variant === 'athena' && (
              <>
                <FormControl required>
                  <FormControl.Label>Database</FormControl.Label>
                  <TextInput
                    block
                    value={formValues.database}
                    onChange={valueDatabaseChange}
                  />
                  {validationResult.database === false && (
                    <FormControl.Validation variant="error">
                      Database must have more than 1.
                    </FormControl.Validation>
                  )}
                </FormControl>
                <FormControl required>
                  <FormControl.Label>Output Bucket</FormControl.Label>
                  <TextInput
                    block
                    value={formValues.outputBucket}
                    onChange={valueOutputBucketChange}
                  />
                  {validationResult.database === false && (
                    <FormControl.Validation variant="error">
                      Output bucket must have more than 1.
                    </FormControl.Validation>
                  )}
                </FormControl>
              </>
            )}
            <FormControl required>
              <FormControl.Label>Description</FormControl.Label>
              <Textarea
                block
                value={formValues.description}
                onChange={valueDescriptionChange}
              />
              {validationResult.description === false && (
                <FormControl.Validation variant="error">
                  Description must have more than 2 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <Button
              variant="primary"
              disabled={
                !validationResult.database ||
                !validationResult.outputBucket ||
                !validationResult.name ||
                !validationResult.description
              }
              sx={{ marginTop: 2 }}
              onClick={e => {
                e.preventDefault();
                submitCreate();
              }}
            >
              Create a datasource
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DatasourceNew;
