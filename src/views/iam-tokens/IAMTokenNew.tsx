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
  Box,
  Textarea,
  Select,
  Text,
  IconButton,
} from '@primer/react';
import { CopyIcon } from '@primer/octicons-react';
import { Calendar, defaultCalendarStrings } from '@fluentui/react';
import { useCache, useNavigate, useToast } from '../../hooks';
import { IIAMToken, IIAMTokenVariant } from '../../models';
import { useRunStore } from '../../state';

interface FormData {
  variant: IIAMTokenVariant;
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

export const IAMTokenNew = () => {
  const runStore = useRunStore();
  const { useCreateToken } = useCache();
  const createTokenMutation = useCreateToken();

  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const [today, _] = useState<Date>(new Date());
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState<IIAMToken>();
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
      variant: event.target.value as IIAMTokenVariant,
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
  const valueSubmit = () => {
    runStore.layout().showBackdrop('Creating an token...');
    createTokenMutation.mutate(
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
            setToken(resp.token);
            setShowToken(true);
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
      {showToken ? (
        <>
          <PageHeader>
            <PageHeader.TitleArea variant="large">
              <PageHeader.Title>Your Token is created</PageHeader.Title>
            </PageHeader.TitleArea>
          </PageHeader>
          <Box>
            <Text>
              Take note of the Token value, you won't be able to see it after.
            </Text>
          </Box>
          <Box>
            <Text>Name: {token?.name}</Text>
          </Box>
          <Box>
            <Text>Description: {token?.description}</Text>
          </Box>
          <Box>
            <Text>Expiration date: {token?.expirationDate.toISOString()}</Text>
          </Box>
          <Box>
            <Text mb={2}>Value: </Text>
            <Box display="flex" sx={{ alignItems: 'center', gap: 2 }}>
              <Text
                as="code"
                sx={{
                  color: 'fg.onEmphasis',
                  bg: 'neutral.emphasis',
                  p: 2,
                  overflowWrap: 'anywhere',
                  flex: 1,
                }}
              >
                {token?.value}
              </Text>
              <IconButton
                aria-label="Copy token to clipboard"
                icon={CopyIcon}
                size="small"
                onClick={() => {
                  if (token?.value) {
                    navigator.clipboard.writeText(token.value);
                    enqueueToast('Token copied to clipboard', {
                      variant: 'success',
                    });
                  }
                }}
              />
            </Box>
          </Box>
          <Box mt={3}>
            <Button onClick={e => navigate('/settings/iam/tokens', e)}>
              List my Tokens
            </Button>
          </Box>
        </>
      ) : (
        <>
          <PageHeader>
            <PageHeader.TitleArea variant="large">
              <PageHeader.Title>New IAM Token</PageHeader.Title>
            </PageHeader.TitleArea>
          </PageHeader>
          <Box display="grid" gridTemplateColumns="1fr 1fr" sx={{ gap: 3 }}>
            <Box>
              <Box sx={{ label: { marginTop: 2 } }}>
                <FormControl required>
                  <FormControl.Label>Token type</FormControl.Label>
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
                    valueSubmit();
                  }}
                >
                  Create a token
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default IAMTokenNew;
