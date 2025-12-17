/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  PageHeader,
  Heading,
  Text,
  Button,
  TextInput,
  FormControl,
  Textarea,
  Label,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { EyeIcon, EyeClosedIcon } from '@primer/octicons-react';
import { BoringAvatar } from '../../components/avatars';
import { ISecret as AnySecret } from '../../models';
import { useCache, useNavigate, useToast } from '../../hooks';
import { useRunStore } from '../../state';

interface ValidationData {
  name?: boolean;
  nameConfirm?: boolean;
  description?: boolean;
  value?: boolean;
}

interface FormData {
  name: string;
  nameConfirm: string;
  description: string;
  value: string;
}

export const SecretEdit = () => {
  const { secretId } = useParams();
  const runStore = useRunStore();
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const { useUpdateSecret, useSecret, useDeleteSecret } = useCache();

  const updateSecretMutation = useUpdateSecret();
  const deleteSecretMutation = useDeleteSecret();
  const secretQuery = useSecret(secretId!, {
    refetchOnMount: true,
  });

  const [secret, setSecret] = useState<AnySecret>();
  const [formValues, setFormValues] = useState<FormData>({
    name: '',
    nameConfirm: '',
    description: '',
    value: '',
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    name: undefined,
    nameConfirm: undefined,
    description: undefined,
    value: undefined,
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  useEffect(() => {
    if (secretQuery.data) {
      const secret = secretQuery.data as AnySecret;
      setSecret(secret);
      setFormValues({
        name: secret.name || '',
        nameConfirm: '',
        description: secret.description || '',
        value: secret.value ? atob(secret.value) : '',
      });
    }
  }, [secretQuery.data]);
  const secretNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      name: event.target.value,
    }));
  };
  const secretNameConfirmChanged = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      nameConfirm: event.target.value,
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
  const secretValueChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      value: event.target.value,
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
      nameConfirm: formValues.nameConfirm === secret?.name ? true : false,
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
  const submitUpdate = async () => {
    runStore.layout().showBackdrop('Updating the secret...');
    secret!.name = formValues.name;
    secret!.description = formValues.description;
    secret!.value = btoa(formValues.value);
    updateSecretMutation.mutate(secret!, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast('The secret is successfully updated.', {
            variant: 'success',
          });
          setSecret(secret);
        }
      },
      onSettled: () => {
        runStore.layout().hideBackdrop();
      },
    });
  };
  const submitDelete = async () => {
    runStore.layout().showBackdrop('Deleting the secret...');
    deleteSecretMutation.mutate(secret!.id, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast('The secret is successfully deleted.', {
            variant: 'success',
          });
          navigate(`/settings/iam/secrets`);
        }
      },
      onSettled: () => {
        runStore.layout().hideBackdrop();
      },
    });
  };
  return (
    <>
      <PageHeader>
        <Heading sx={{ fontSize: 3 }}>Secret</Heading>
      </PageHeader>
      <Box display="flex">
        <Box>
          <BoringAvatar
            displayName={secret?.name}
            size={100}
            style={{ paddingRight: 10 }}
          />
          <Text as="h2" sx={{ paddingTop: 3 }}>
            {secret?.name}
          </Text>
          <Box mt={3}>
            <Label size="large">{secret?.variant}</Label>
          </Box>
        </Box>
        <Box ml={10}>
          <Box sx={{ label: { marginTop: 2 } }}>
            <FormControl>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput
                block
                value={formValues.name}
                onChange={secretNameChanged}
              />
              {validationResult.name === false && (
                <FormControl.Validation variant="error">
                  Name must have more than 2 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <FormControl>
              <FormControl.Label>Description</FormControl.Label>
              <Textarea
                block
                value={formValues.description}
                onChange={secretDescriptionChanged}
                rows={5}
              />
              {validationResult.description === false && (
                <FormControl.Validation variant="error">
                  Description must have more than 2 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <FormControl>
              <FormControl.Label>Value</FormControl.Label>
              <TextInput
                placeholder="Value"
                monospace
                size="large"
                contrast={!passwordVisible}
                disabled={!passwordVisible}
                onChange={secretValueChanged}
                type={passwordVisible ? 'text' : 'password'}
                value={formValues.value}
                trailingAction={
                  <TextInput.Action
                    onClick={() => {
                      setPasswordVisible(!passwordVisible);
                    }}
                    icon={passwordVisible ? EyeClosedIcon : EyeIcon}
                    aria-label={
                      passwordVisible ? 'Hide secret' : 'Reveal secret'
                    }
                    sx={{ color: 'var(--fgColor-muted)' }}
                  />
                }
                sx={{ overflow: 'visible' }}
              />
              {validationResult.value === false && (
                <FormControl.Validation variant="error">
                  Value must have more than 1 and less than 4096 characters.
                </FormControl.Validation>
              )}
            </FormControl>
            <Box sx={{ marginTop: 3 }}>
              <Button
                variant="primary"
                disabled={
                  !validationResult.name || !validationResult.description
                }
                onClick={submitUpdate}
              >
                Update secret
              </Button>
            </Box>
          </Box>
          <Box sx={{ marginTop: 3 }}>
            <Heading
              as="h2"
              sx={{
                fontSize: 4,
                fontWeight: 'normal',
                color: 'danger.fg',
                mb: 2,
              }}
            >
              Danger zone
            </Heading>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'danger.emphasis',
                borderRadius: 2,
                p: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 3,
              }}
            >
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Text
                  sx={{ fontSize: 1, fontWeight: 'bold', color: 'danger.fg' }}
                >
                  Confirm the secret name to delete
                </Text>
                <FormControl>
                  <TextInput
                    block
                    value={formValues.nameConfirm}
                    onChange={secretNameConfirmChanged}
                  />
                </FormControl>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                  This operation is not reversible.
                </Text>
              </Box>
              <Button
                variant="danger"
                disabled={!validationResult.nameConfirm}
                onClick={submitDelete}
              >
                Delete secret
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default SecretEdit;
