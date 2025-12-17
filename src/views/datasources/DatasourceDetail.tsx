/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  PageHeader,
  Heading,
  Text,
  Box,
  Button,
  TextInput,
  FormControl,
  Textarea,
  Label,
} from '@primer/react';
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
  const datasourceQuery = useDatasource(datasourceId!);

  const [datasource, setDatasource] = useState<AnyDatasource>();
  const [formValues, setFormValues] = useState<FormData>({
    name: datasource?.name!,
    description: datasource?.description!,
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
      setFormValues({ ...datasource });
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
    datasource!.name = formValues.name;
    datasource!.description = formValues.description;
    updateDatasourceMutation.mutate(datasource!, {
      onSuccess: (resp: any) => {
        if (resp.success) {
          enqueueToast('The datasource is successfully updated.', {
            variant: 'success',
          });
          setDatasource(datasource);
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
        <Heading sx={{ fontSize: 3 }}>Datasource</Heading>
      </PageHeader>
      <Box display="flex">
        <Box>
          <BoringAvatar
            displayName={datasource?.name}
            size={100}
            style={{ paddingRight: 10 }}
          />
          <Text as="h2" sx={{ paddingTop: 3 }}>
            {datasource?.name}
          </Text>
          <Box mt={3}>
            <Label size="large">{datasource?.variant}</Label>
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
              <FormControl.Label>Database</FormControl.Label>
              <TextInput
                placeholder="Database"
                monospace
                contrast
                size="large"
                type={passwordVisibility ? 'text' : 'password'}
                value={datasource?.database}
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
                contrast
                size="large"
                type={passwordVisibility ? 'text' : 'password'}
                value={datasource?.outputBucket}
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
            <Button
              variant="primary"
              disabled={!validationResult.name || !validationResult.description}
              sx={{ marginTop: 3 }}
              onClick={nameSubmit}
            >
              Update datasource
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default DatasourceDetail;
