/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  CheckIcon,
  CopyIcon,
  EyeClosedIcon,
  EyeIcon,
} from '@primer/octicons-react';
import { Box } from '@datalayer/primer-addons';
import { BoringAvatar } from '../../components/avatars';
import { IIAMToken as IAPIKey } from '../../models';
import { useCache, useNavigate, useToast } from '../../hooks';
import { useRunStore } from '../../state';

interface ValidationData {
  name?: boolean;
  nameConfirm?: boolean;
  description?: boolean;
}

interface FormData {
  name: string;
  nameConfirm: string;
  description: string;
}

export type APIKeyEditProps = {
  /** Route to navigate after delete. Defaults to '/settings/iam/api-keys'. */
  apiKeysListRoute?: string;
  /** Whether to render the local edit title header. Defaults to true. */
  showTitle?: boolean;
};

export const APIKeyEdit = ({
  apiKeysListRoute = '/settings/iam/api-keys',
  showTitle = true,
}: APIKeyEditProps = {}) => {
  const { tokenId: apiKeyId } = useParams();
  const runStore = useRunStore();
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const {
    useUpdateToken: useUpdateAPIKey,
    useToken: useAPIKey,
    useDeleteToken: useDeleteAPIKey,
    useTokenValue: useAPIKeyValue,
  } = useCache();

  const getAPIKeyQuery = useAPIKey(apiKeyId!);
  const updateAPIKeyMutation = useUpdateAPIKey();
  const deleteAPIKeyMutation = useDeleteAPIKey();
  const apiKeyValueMutation = useAPIKeyValue();

  // The key's value, fetched only when reveal or copy is pressed (the user,
  // 21 November 2026), never on load; forgotten when the page is left.
  const [keyValue, setKeyValue] = useState<string>();
  const [keyValueVisible, setKeyValueVisible] = useState(false);
  const [keyValueCopied, setKeyValueCopied] = useState(false);
  const [keyValueLoading, setKeyValueLoading] = useState(false);
  const resetKeyValueMutation = useRef(apiKeyValueMutation.reset);
  resetKeyValueMutation.current = apiKeyValueMutation.reset;
  const forgetKeyValue = useCallback(() => {
    setKeyValue(undefined);
    setKeyValueVisible(false);
    setKeyValueCopied(false);
    resetKeyValueMutation.current();
  }, []);
  useEffect(() => {
    // Another key, or this page left: the value goes with it.
    forgetKeyValue();
    return forgetKeyValue;
  }, [apiKeyId, forgetKeyValue]);
  useEffect(() => {
    // Leaving the browser tab leaves the page too.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        forgetKeyValue();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [forgetKeyValue]);
  useEffect(() => {
    if (!keyValueCopied) {
      return;
    }
    const timer = window.setTimeout(() => setKeyValueCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [keyValueCopied]);
  const fetchKeyValue = useCallback(async (): Promise<string | undefined> => {
    if (keyValue) {
      return keyValue;
    }
    if (!apiKeyId) {
      return undefined;
    }
    setKeyValueLoading(true);
    try {
      const value = await apiKeyValueMutation.mutateAsync(apiKeyId);
      setKeyValue(value);
      return value;
    } catch (error: any) {
      enqueueToast(
        error?.message || 'The API key value could not be revealed.',
        { variant: 'error' },
      );
      return undefined;
    } finally {
      setKeyValueLoading(false);
    }
  }, [keyValue, apiKeyId, apiKeyValueMutation, enqueueToast]);
  const toggleKeyValue = useCallback(async () => {
    if (keyValueVisible) {
      setKeyValueVisible(false);
      return;
    }
    if (await fetchKeyValue()) {
      setKeyValueVisible(true);
    }
  }, [keyValueVisible, fetchKeyValue]);
  const copyKeyValue = useCallback(async () => {
    const value = await fetchKeyValue();
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setKeyValueCopied(true);
      enqueueToast('API key copied to the clipboard.', { variant: 'success' });
    } catch {
      setKeyValueCopied(false);
      enqueueToast('The API key could not be copied.', { variant: 'error' });
    }
  }, [fetchKeyValue, enqueueToast]);

  const [apiKey, setAPIKey] = useState<IAPIKey>();
  const [formValues, setFormValues] = useState<FormData>({
    name: apiKey?.name!,
    nameConfirm: '',
    description: apiKey?.description!,
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    name: undefined,
    nameConfirm: undefined,
    description: undefined,
  });
  useEffect(() => {
    if (getAPIKeyQuery.data) {
      const key = getAPIKeyQuery.data;
      setAPIKey(key);
      setFormValues({ ...key, nameConfirm: '' });
    }
  }, [getAPIKeyQuery.data]);
  const nameNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      name: event.target.value,
    }));
  };
  const nameConfirmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      nameConfirm: event.target.value,
    }));
  };
  const nameDescriptionChange = (
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
      nameConfirm: formValues.nameConfirm === apiKey?.name ? true : false,
      description:
        formValues.description === undefined
          ? undefined
          : formValues.description.length > 2
            ? true
            : false,
    });
  }, [formValues]);
  const submitAPIKey = async () => {
    runStore.layout().showBackdrop();
    const updatedAPIKey = {
      ...apiKey!,
      name: formValues.name,
      description: formValues.description,
    };
    updateAPIKeyMutation.mutate(updatedAPIKey, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast('The API key was updated successfully.', {
            variant: 'success',
          });
          setAPIKey(updatedAPIKey);
        } else {
          enqueueToast(resp.message || 'The API key could not be updated.', {
            variant: 'error',
          });
        }
      },
      onError: (error: any) => {
        enqueueToast(error?.message || 'The API key could not be updated.', {
          variant: 'error',
        });
      },
      onSettled: () => {
        runStore.layout().hideBackdrop();
      },
    });
  };
  const deleteAPIKey = async () => {
    runStore.layout().showBackdrop('Deleting the API key...');
    deleteAPIKeyMutation.mutate(apiKey!.id, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast('The API key was deleted successfully.', {
            variant: 'success',
          });
          navigate(apiKeysListRoute);
        } else {
          enqueueToast(resp.message || 'Failed to delete API key.', {
            variant: 'error',
          });
        }
      },
      onError: () => {
        enqueueToast('Failed to delete API key.', { variant: 'error' });
      },
      onSettled: () => {
        runStore.layout().hideBackdrop();
      },
    });
  };
  return (
    <>
      {showTitle && (
        <PageHeader>
          <Heading sx={{ fontSize: 3 }}>API Key</Heading>
        </PageHeader>
      )}
      <Box display="flex">
        <Box>
          <BoringAvatar
            displayName={apiKey?.name}
            size={100}
            style={{ paddingRight: 10 }}
          />
          <Text as="h2" sx={{ paddingTop: 3 }}>
            {apiKey?.name}
          </Text>
          <Box mt={3}>
            <Label size="large">{apiKey?.variant}</Label>
          </Box>
        </Box>
        <Box ml={10}>
          <Box sx={{ label: { marginTop: 2 } }}>
            <FormControl>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput
                block
                value={formValues.name}
                onChange={nameNameChange}
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
                onChange={nameDescriptionChange}
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
                block
                monospace
                readOnly
                aria-busy={keyValueLoading}
                type={keyValueVisible ? 'text' : 'password'}
                value={keyValueVisible && keyValue ? keyValue : ''}
                placeholder={'\u2022'.repeat(24)}
                trailingAction={
                  <>
                    <TextInput.Action
                      onClick={toggleKeyValue}
                      icon={keyValueVisible ? EyeClosedIcon : EyeIcon}
                      aria-label={
                        keyValueVisible ? 'Hide API key' : 'Reveal API key'
                      }
                      disabled={keyValueLoading}
                      sx={{ color: 'var(--fgColor-muted)' }}
                    />
                    <TextInput.Action
                      onClick={copyKeyValue}
                      icon={keyValueCopied ? CheckIcon : CopyIcon}
                      aria-label={
                        keyValueCopied ? 'API key copied' : 'Copy API key'
                      }
                      disabled={keyValueLoading}
                      sx={{
                        color: keyValueCopied
                          ? 'var(--fgColor-success)'
                          : 'var(--fgColor-muted)',
                      }}
                    />
                  </>
                }
                sx={{ overflow: 'visible' }}
              />
              <FormControl.Caption>
                Fetched only when you reveal or copy it, and hidden again when
                you leave this page.
              </FormControl.Caption>
            </FormControl>
            <FormControl>
              <FormControl.Label>Expiration date</FormControl.Label>
              <TextInput
                block
                value={apiKey?.expirationDate.toLocaleDateString()}
                onChange={nameNameChange}
                disabled
              />
            </FormControl>
            <Button
              variant="primary"
              disabled={!validationResult.name || !validationResult.description}
              sx={{ marginTop: 3 }}
              onClick={submitAPIKey}
            >
              Update API key
            </Button>
          </Box>
          <Box marginTop={3}>
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
              border="1px solid"
              borderColor="danger.emphasis"
              borderRadius={2}
              p={3}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap={3}
            >
              <Box display="grid" gap={1}>
                <Text
                  sx={{ fontSize: 1, fontWeight: 'bold', color: 'danger.fg' }}
                >
                  Confirm the API key name to delete
                </Text>
                <FormControl>
                  <TextInput
                    block
                    value={formValues.nameConfirm}
                    onChange={nameConfirmChange}
                  />
                </FormControl>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
                  This operation is not reversible.
                </Text>
              </Box>
              <Button
                variant="danger"
                disabled={!validationResult.nameConfirm}
                onClick={deleteAPIKey}
              >
                Delete API key
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default APIKeyEdit;
