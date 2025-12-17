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
  Textarea,
  Select,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { useCache, useNavigate, useToast } from '../../hooks';
import { ISecretVariant } from '../../models';
import { useRunStore } from '../../state';

interface FormData {
  variant: ISecretVariant;
  value?: string;
  name?: string;
  description?: string;
}

interface ValidationData {
  variant?: boolean;
  value?: boolean;
  name?: boolean;
  description?: boolean;
}

export const SecretNew = () => {
  const runStore = useRunStore();
  const navigate = useNavigate();
  const { useCreateSecret } = useCache();

  const createSecretMutation = useCreateSecret();

  const { enqueueToast } = useToast();
  const [formValues, setFormValues] = useState<FormData>({
    variant: 'generic',
    value: undefined,
    name: undefined,
    description: undefined,
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    variant: undefined,
    value: undefined,
    name: undefined,
    description: undefined,
  });
  const secretVariantChanged = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      variant: event.target.value as ISecretVariant,
    }));
  };
  const secretValueChanged = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      value: event.target.value,
    }));
  };
  const secretNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      name: event.target.value,
    }));
  };
  const secretDescriptionChanged = (
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
      value:
        formValues.value === undefined
          ? undefined
          : formValues.value.length > 0 && formValues.value.length < 4096
            ? true
            : false,
    });
  }, [formValues]);
  const submitCreate = () => {
    runStore.layout().showBackdrop('Creating an secret...');
    createSecretMutation.mutate(
      {
        variant: formValues.variant,
        name: formValues.name!,
        description: formValues.description!,
        value: btoa(formValues.value!),
      },
      {
        onSuccess: (resp: any) => {
          if (resp.success) {
            enqueueToast(resp.message, { variant: 'success' });
            navigate(`/settings/iam/secrets`);
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
          <PageHeader.Title>New Secret</PageHeader.Title>
        </PageHeader.TitleArea>
      </PageHeader>
      <Box display="grid" gridTemplateColumns="1fr 1fr" sx={{ gap: 3 }}>
        <Box>
          <Box sx={{ label: { marginTop: 2 } }}>
            <FormControl required>
              <FormControl.Label>Secret type</FormControl.Label>
              <Select
                name="type"
                value={formValues.variant}
                onChange={secretVariantChanged}
              >
                <Select.Option value="generic">Generic</Select.Option>
                <Select.Option value="password">Password</Select.Option>
                <Select.Option value="key">Key</Select.Option>
                <Select.Option value="token">Token</Select.Option>
              </Select>
              <FormControl.Caption>
                Pick the most appropriate secret type.
              </FormControl.Caption>
            </FormControl>
            <FormControl required>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput
                block
                value={formValues.name}
                onChange={secretNameChanged}
                autoFocus
              />
              <FormControl.Caption>
                Hint: The secret name is a short name that identifies in a
                unique way your secret.
              </FormControl.Caption>
              {validationResult.name === false && (
                <FormControl.Validation variant="error">
                  Name length must be between 2 and 32 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <FormControl required>
              <FormControl.Label>Description</FormControl.Label>
              <Textarea
                block
                value={formValues.description}
                onChange={secretDescriptionChanged}
                rows={3}
              />
              {validationResult.description === false && (
                <FormControl.Validation variant="error">
                  Description must have more than 2 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <FormControl required>
              <FormControl.Label>Value</FormControl.Label>
              <Textarea
                block
                value={formValues.value}
                onChange={secretValueChanged}
                rows={5}
              />
              {validationResult.value === false && (
                <FormControl.Validation variant="error">
                  Value must have more than 1 and less than 4096 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <Button
              variant="primary"
              disabled={
                !validationResult.value ||
                !validationResult.name ||
                !validationResult.description
              }
              sx={{ marginTop: 2 }}
              onClick={e => {
                e.preventDefault();
                submitCreate();
              }}
            >
              Create a secret
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SecretNew;
