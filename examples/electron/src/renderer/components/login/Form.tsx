/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import {
  FormControl,
  TextInput,
  Text,
  Button as PrimerButton,
} from '@primer/react';
import { COLORS } from '../../../shared/constants/colors';
import { LoginFormProps } from '../../../shared/types';
import Button from './Button';

const Form: React.FC<LoginFormProps> = ({
  formData,
  state,
  onFormDataChange,
  onSubmit,
  onKeyPress,
}) => {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
      aria-label="Datalayer authentication form"
    >
      <fieldset
        disabled={state.loading}
        style={{ border: 'none', padding: 0, margin: 0 }}
      >
        <legend
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0',
          }}
        >
          Login credentials
        </legend>

        <FormControl sx={{ mb: 3 }} required id="run-url-input">
          <FormControl.Label>Run URL *</FormControl.Label>
          <TextInput
            block
            size="large"
            value={formData.runUrl}
            onChange={e => onFormDataChange('runUrl', e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="https://prod1.datalayer.run"
            aria-label="Datalayer instance URL"
            aria-describedby="run-url-help"
            aria-invalid={!formData.runUrl && state.error ? 'true' : 'false'}
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: COLORS.brand.primary,
                outlineOffset: '2px',
              },
            }}
          />
          <FormControl.Caption id="run-url-help">
            The URL of your Datalayer instance (required)
          </FormControl.Caption>
        </FormControl>

        <FormControl sx={{ mb: 4 }} required id="api-token-input">
          <FormControl.Label>API Token *</FormControl.Label>
          <TextInput
            block
            size="large"
            type="password"
            value={formData.token}
            onChange={e => onFormDataChange('token', e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Enter your API token"
            aria-label="Datalayer API authentication token"
            aria-describedby="api-token-help"
            aria-invalid={!formData.token && state.error ? 'true' : 'false'}
            autoComplete="current-password"
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: COLORS.brand.primary,
                outlineOffset: '2px',
              },
            }}
          />
          <FormControl.Caption id="api-token-help">
            <Text>
              Your Datalayer API token for authentication (required).{' '}
              <PrimerButton
                as="a"
                variant="invisible"
                size="small"
                href="https://datalayer.app/settings/iam/tokens"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Datalayer settings to get an API token (opens in new tab)"
                sx={{
                  p: 0,
                  fontSize: 'inherit',
                  verticalAlign: 'baseline',
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: COLORS.brand.primary,
                    outlineOffset: '2px',
                    borderRadius: 1,
                  },
                }}
              >
                Get a token
              </PrimerButton>
            </Text>
          </FormControl.Caption>
        </FormControl>

        <Button
          loading={state.loading}
          disabled={state.loading || !formData.runUrl || !formData.token}
          onClick={onSubmit}
        />
      </fieldset>
    </form>
  );
};

export default Form;
