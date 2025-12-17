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
import { BoringAvatar } from '../../components/avatars';
import { IIAMToken as AnyToken } from '../../models';
import { useCache, useToast } from '../../hooks';
import { useRunStore } from '../../state';

interface ValidationData {
  name?: boolean;
  description?: boolean;
}

interface FormData {
  name: string;
  description: string;
}

export const IAMTokenEdit = () => {
  const { tokenId } = useParams();
  const runStore = useRunStore();
  const { enqueueToast } = useToast();
  const { useUpdateToken, useToken } = useCache();

  const getTokenQuery = useToken(tokenId!);
  const updateTokenMutation = useUpdateToken();

  const [token, setToken] = useState<AnyToken>();
  const [formValues, setFormValues] = useState<FormData>({
    name: token?.name!,
    description: token?.description!,
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    name: undefined,
    description: undefined,
  });
  useEffect(() => {
    if (getTokenQuery.data) {
      const token = getTokenQuery.data;
      setToken(token);
      setFormValues({ ...token });
    }
  }, [getTokenQuery.data]);
  const nameNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues(prevFormValues => ({
      ...prevFormValues,
      name: event.target.value,
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
      description:
        formValues.description === undefined
          ? undefined
          : formValues.description.length > 2
            ? true
            : false,
    });
  }, [formValues]);
  const nameSubmit = async () => {
    runStore.layout().showBackdrop();
    const updatedToken = {
      ...token!,
      name: formValues.name,
      description: formValues.description,
    };
    updateTokenMutation.mutate(updatedToken, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast('The token is successfully updated.', {
            variant: 'success',
          });
          setToken(updatedToken);
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
        <Heading sx={{ fontSize: 3 }}>IAM Token</Heading>
      </PageHeader>
      <Box display="flex">
        <Box>
          <BoringAvatar
            displayName={token?.name}
            size={100}
            style={{ paddingRight: 10 }}
          />
          <Text as="h2" sx={{ paddingTop: 3 }}>
            {token?.name}
          </Text>
          <Box mt={3}>
            <Label size="large">{token?.variant}</Label>
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
              <FormControl.Label>Expiration date</FormControl.Label>
              <TextInput
                block
                value={token?.expirationDate.toLocaleDateString()}
                onChange={nameNameChange}
                disabled
              />
            </FormControl>
            <Button
              variant="primary"
              disabled={!validationResult.name || !validationResult.description}
              sx={{ marginTop: 3 }}
              onClick={nameSubmit}
            >
              Update token
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default IAMTokenEdit;
