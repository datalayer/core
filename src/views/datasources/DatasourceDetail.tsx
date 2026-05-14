/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  PageLayout,
  Text,
  Button,
  TextInput,
  FormControl,
  Textarea,
  Label,
  Spinner,
  Heading,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { EyeIcon, EyeClosedIcon } from '@primer/octicons-react';
import { BoringAvatar } from '../../components/avatars';
import { IDatasource as AnyDatasource } from '../../models';
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

export const DatasourceDetail = () => {
  const { datasourceId } = useParams();
  const runStore = useRunStore();
  const { enqueueToast } = useToast();
  const { useUpdateDatasource, useDatasource } = useCache();

  const updateDatasourceMutation = useUpdateDatasource();
  const datasourceQuery = useDatasource(datasourceId ?? '');

  const [datasource, setDatasource] = useState<AnyDatasource>();
  const [formValues, setFormValues] = useState<FormData>({
    name: '',
    description: '',
  });
  const [validationResult, setValidationResult] = useState<ValidationData>({
    name: undefined,
    description: undefined,
  });
  const [passwordVisibility, setPasswordVisibility] = useState(false);

  useEffect(() => {
    if (datasourceQuery.data) {
      const datasource = datasourceQuery.data as AnyDatasource;
      setDatasource(datasource);
      setFormValues({
        name: datasource.name || '',
        description: datasource.description || '',
      });
    }
  }, [datasourceQuery.data]);
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
    setValidationResult(prev => ({
      ...prev,
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
    }));
  }, [formValues]);
  const nameSubmit = async () => {
    if (!datasource) {
      return;
    }
    runStore.layout().showBackdrop();
    const updatedDatasource = {
      ...datasource,
      name: formValues.name,
      description: formValues.description,
    };
    updateDatasourceMutation.mutate(updatedDatasource, {
      onSuccess: (resp: unknown) => {
        if (
          typeof resp === 'object' &&
          resp !== null &&
          'success' in resp &&
          (resp as { success: boolean }).success
        ) {
          enqueueToast('The datasource is successfully updated.', {
            variant: 'success',
          });
          setDatasource(updatedDatasource);
        }
      },
      onSettled: () => {
        runStore.layout().hideBackdrop();
      },
    });
  };

  if (!datasourceId) {
    return <></>;
  }

  if (datasourceQuery.isLoading) {
    return (
      <PageLayout
        containerWidth="full"
        padding="normal"
        style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
      >
        <PageLayout.Content>
          <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 6,
              }}
            >
              <Spinner size="large" />
            </Box>
          </Box>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  if (datasourceQuery.isError || (!datasourceQuery.isLoading && !datasource)) {
    return (
      <PageLayout
        containerWidth="full"
        padding="normal"
        style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
      >
        <PageLayout.Content>
          <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
            <Box sx={{ p: 4 }}>
              <Text sx={{ color: 'danger.fg' }}>
                Datasource not found or failed to load.
              </Text>
            </Box>
          </Box>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      containerWidth="full"
      padding="normal"
      style={{ overflow: 'visible', minHeight: 'calc(100vh - 45px)' }}
    >
      <PageLayout.Content>
        <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
          <Box sx={{ mb: 4 }}>
            <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
              Datasource
            </Heading>
            <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
              Update datasource connection metadata and review configured credentials.
            </Text>
          </Box>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              bg: 'canvas.default',
              p: 3,
            }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: ['1fr', '180px 1fr'], gap: 4 }}>
              <Box>
                <BoringAvatar
                  displayName={datasource?.name}
                  size={100}
                  style={{ paddingRight: 10 }}
                />
                <Box mt={3}>
                  <Label size="large">{datasource?.variant}</Label>
                </Box>
              </Box>
              <Box>
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
                    <FormControl.Label>Database</FormControl.Label>
                    <TextInput
                      placeholder="Database"
                      monospace
                      size="large"
                      contrast={!passwordVisibility}
                      disabled={!passwordVisibility}
                      type={passwordVisibility ? 'text' : 'password'}
                      value={datasource?.database || ''}
                      readOnly
                      trailingAction={
                        <TextInput.Action
                          onClick={() => {
                            setPasswordVisibility(!passwordVisibility);
                          }}
                          icon={passwordVisibility ? EyeClosedIcon : EyeIcon}
                          aria-label={
                            passwordVisibility ? 'Hide database' : 'Reveal database'
                          }
                          sx={{ color: 'var(--fgColor-muted)' }}
                        />
                      }
                      sx={{ overflow: 'visible' }}
                    />
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Output bucket</FormControl.Label>
                    <TextInput
                      placeholder="Output bucket"
                      monospace
                      size="large"
                      contrast={!passwordVisibility}
                      disabled={!passwordVisibility}
                      type={passwordVisibility ? 'text' : 'password'}
                      value={datasource?.outputBucket || ''}
                      readOnly
                      trailingAction={
                        <TextInput.Action
                          onClick={() => {
                            setPasswordVisibility(!passwordVisibility);
                          }}
                          icon={passwordVisibility ? EyeClosedIcon : EyeIcon}
                          aria-label={
                            passwordVisibility
                              ? 'Hide output bucket'
                              : 'Reveal output bucket'
                          }
                          sx={{ color: 'var(--fgColor-muted)' }}
                        />
                      }
                      sx={{ overflow: 'visible' }}
                    />
                  </FormControl>
                  <Box sx={{ marginTop: 3 }}>
                    <Button
                      variant="primary"
                      disabled={
                        !validationResult.name || !validationResult.description
                      }
                      onClick={nameSubmit}
                    >
                      Update datasource
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default DatasourceDetail;
