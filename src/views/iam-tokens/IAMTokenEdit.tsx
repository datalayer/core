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

export type IAMTokenEditProps = {
  /** Route to navigate after delete. Defaults to '/settings/iam/tokens'. */
  tokensListRoute?: string;
};

export const IAMTokenEdit = ({
  tokensListRoute = '/settings/iam/tokens',
}: IAMTokenEditProps = {}) => {
  const { tokenId } = useParams();
  const runStore = useRunStore();
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const { useUpdateToken, useToken, useDeleteToken } = useCache();

  const getTokenQuery = useToken(tokenId!);
  const updateTokenMutation = useUpdateToken();
  const deleteTokenMutation = useDeleteToken();

  const [token, setToken] = useState<AnyToken>();
  const [formValues, setFormValues] = useState<FormData>({
    name: token?.name!,
    nameConfirm: '',
    description: token?.description!,
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    name: undefined,
    nameConfirm: undefined,
    description: undefined,
  });
  useEffect(() => {
    if (getTokenQuery.data) {
      const token = getTokenQuery.data;
      setToken(token);
      setFormValues({ ...token, nameConfirm: '' });
    }
  }, [getTokenQuery.data]);
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
      nameConfirm: formValues.nameConfirm === token?.name ? true : false,
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
  const handleDelete = async () => {
    runStore.layout().showBackdrop('Deleting the token...');
    deleteTokenMutation.mutate(token!.id, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast('The token is successfully deleted.', {
            variant: 'success',
          });
          navigate(tokensListRoute);
        } else {
          enqueueToast(resp.message || 'Failed to delete token.', {
            variant: 'error',
          });
        }
      },
      onError: () => {
        enqueueToast('Failed to delete token.', { variant: 'error' });
      },
      onSettled: () => {
        runStore.layout().hideBackdrop();
      },
    });
  };
  return (
    <>
      <PageHeader>
        <Heading sx={{ fontSize: 3 }}>API Key</Heading>
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
                  Confirm the token name to delete
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
                onClick={handleDelete}
              >
                Delete token
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default IAMTokenEdit;
