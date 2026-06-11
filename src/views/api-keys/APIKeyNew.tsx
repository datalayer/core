/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect, useState } from 'react';
import {
  PageHeader,
  FormControl,
  Button,
  TextInput,
  Textarea,
  Select,
  Text,
  IconButton,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { CopyIcon } from '@primer/octicons-react';
import { Calendar, defaultCalendarStrings } from '@fluentui/react';
import { useCache, useNavigate, useToast } from '../../hooks';
import {
  IIAMToken as IAPIKey,
  IIAMTokenVariant as IAPIKeyVariant,
} from '../../models';
import { useRunStore } from '../../state';

interface FormData {
  variant: IAPIKeyVariant;
  name?: string;
  description?: string;
  expirationDate?: Date;
}

interface ValidationData {
  variant?: boolean;
  name?: boolean;
  description?: boolean;
  expirationDate?: boolean;
}

export type APIKeyNewProps = {
  /** Route to navigate when clicking "List my API keys". Defaults to '/settings/iam/api-keys'. */
  apiKeysListRoute?: string;
  /** Whether to render the "New API Key" title header in create mode. Defaults to true. */
  showTitle?: boolean;
};

export const APIKeyNew = ({
  apiKeysListRoute = '/settings/iam/api-keys',
  showTitle = true,
}: APIKeyNewProps = {}) => {
  const runStore = useRunStore();
  const { useCreateToken: useCreateAPIKey } = useCache();
  const createAPIKeyMutation = useCreateAPIKey();

  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const [today, _] = useState<Date>(new Date());
  const [showAPIKey, setShowAPIKey] = useState(false);
  const [apiKey, setAPIKey] = useState<IAPIKey>();
  const [formValues, setFormValues] = useState<FormData>({
    variant: 'user_token',
    name: undefined,
    description: undefined,
    expirationDate: undefined,
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    variant: undefined,
    name: undefined,
    description: undefined,
    expirationDate: undefined,
  });
  const valueVariantChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      variant: event.target.value as IAPIKeyVariant,
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
  const expirationDateChange = (expirationDate: Date) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      expirationDate,
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
      expirationDate:
        formValues.expirationDate === undefined
          ? undefined
          : formValues.expirationDate.getTime() > today.getTime()
            ? true
            : false,
    });
  }, [formValues]);
  const submitAPIKey = () => {
    runStore.layout().showBackdrop('Creating an API key...');
    createAPIKeyMutation.mutate(
      {
        name: formValues.name!,
        variant: formValues.variant,
        description: formValues.description!,
        expirationDate: formValues.expirationDate!,
      },
      {
        onSuccess: (resp: any) => {
          if (resp.success && resp.token) {
            enqueueToast(resp.message, { variant: 'success' });
            setAPIKey(resp.token);
            setShowAPIKey(true);
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
      {showAPIKey ? (
        <>
          <PageHeader>
            <PageHeader.TitleArea variant="large">
              <PageHeader.Title>Your API Key Is Created</PageHeader.Title>
            </PageHeader.TitleArea>
          </PageHeader>

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'accent.muted',
              borderRadius: 2,
              p: 3,
              bg: 'canvas.subtle',
              mb: 3,
            }}
          >
            <Text sx={{ fontWeight: 600, color: 'accent.fg' }}>Important</Text>
            <Text as="p" sx={{ mt: 1, color: 'fg.muted' }}>
              Save this API key now. You will not be able to see the full value
              again after leaving this page.
            </Text>
          </Box>

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              p: 3,
              bg: 'canvas.default',
            }}
          >
            <Box
              display="grid"
              gridTemplateColumns="minmax(120px, 180px) 1fr"
              sx={{ rowGap: 2, columnGap: 3, mb: 3 }}
            >
              <Text sx={{ color: 'fg.muted' }}>Name</Text>
              <Text sx={{ fontWeight: 600 }}>{apiKey?.name || '-'}</Text>

              <Text sx={{ color: 'fg.muted' }}>Description</Text>
              <Text>{apiKey?.description || '-'}</Text>

              <Text sx={{ color: 'fg.muted' }}>Expiration date</Text>
              <Text>
                {apiKey?.expirationDate
                  ? `${apiKey.expirationDate.toLocaleString()} (${apiKey.expirationDate.toISOString()})`
                  : '-'}
              </Text>
            </Box>

            <Text sx={{ color: 'fg.muted', mb: 2 }}>API key value</Text>
            <Box
              display="flex"
              sx={{
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Text
                as="code"
                sx={{
                  color: 'fg.default',
                  bg: 'canvas.inset',
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 2,
                  p: 2,
                  overflowWrap: 'anywhere',
                  fontSize: 0,
                  lineHeight: '20px',
                  flex: 1,
                  maxHeight: 140,
                  overflowY: 'auto',
                }}
              >
                {apiKey?.value}
              </Text>
              <IconButton
                aria-label="Copy API key to clipboard"
                icon={CopyIcon}
                size="small"
                onClick={() => {
                  if (apiKey?.value) {
                    navigator.clipboard.writeText(apiKey.value);
                    enqueueToast('API key copied to clipboard', {
                      variant: 'success',
                    });
                  }
                }}
              />
            </Box>
          </Box>

          <Box mt={3}>
            <Button onClick={e => navigate(apiKeysListRoute, e)}>
              List my API Keys
            </Button>
          </Box>
        </>
      ) : (
        <>
          {showTitle ? (
            <PageHeader>
              <PageHeader.TitleArea variant="large">
                <PageHeader.Title>New API Key</PageHeader.Title>
              </PageHeader.TitleArea>
            </PageHeader>
          ) : null}
          <Box display="grid" gridTemplateColumns="1fr 1fr" sx={{ gap: 3 }}>
            <Box>
              <Box sx={{ label: { marginTop: 2 } }}>
                <FormControl required>
                  <FormControl.Label>Type</FormControl.Label>
                  <Select
                    name="type"
                    value={formValues.variant}
                    onChange={valueVariantChange}
                  >
                    <Select.Option value="user_token">User Token</Select.Option>
                  </Select>
                  <FormControl.Caption>
                    Pick the most appropriate token type.
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
                    Hint: The token name is a short name that identifies in a
                    unique way your token.
                  </FormControl.Caption>
                  {validationResult.name === false && (
                    <FormControl.Validation variant="error">
                      Name length must be between 2 and 32 characters.
                    </FormControl.Validation>
                  )}
                </FormControl>
                <FormControl required>
                  <FormControl.Label>Expiration day</FormControl.Label>
                  <Calendar
                    showGoToToday
                    onSelectDate={expirationDateChange}
                    value={formValues.expirationDate}
                    strings={defaultCalendarStrings}
                  />
                  {validationResult.expirationDate !== true ? (
                    <FormControl.Validation variant="error">
                      Pick an expiration date in the future.
                    </FormControl.Validation>
                  ) : (
                    <FormControl.Validation variant="success">
                      Expiration date:{' '}
                      {formValues.expirationDate?.toLocaleDateString()}.
                    </FormControl.Validation>
                  )}
                </FormControl>
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
                    !validationResult.name ||
                    !validationResult.description ||
                    !validationResult.expirationDate
                  }
                  sx={{ marginTop: 2 }}
                  onClick={e => {
                    e.preventDefault();
                    submitAPIKey();
                  }}
                >
                  Create an API key
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default APIKeyNew;
