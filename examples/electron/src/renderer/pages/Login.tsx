/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useCallback } from 'react';
import { Box } from '@primer/react';
import { useDatalayerAPI } from '../hooks/useDatalayerAPI';
import iconImage from '../assets/icon.png';
import Header from '../components/login/Header';
import ErrorMessage from '../components/login/ErrorMessage';
import Form from '../components/login/Form';
import Footer from '../components/login/Footer';
import Version from '../components/login/Version';
import { LoginFormData, LoginState } from '../../shared/types';
import { validateLoginForm, formatLoginError } from '../utils/login';

interface LoginProps {
  onUserDataFetched?: (userData: Record<string, unknown>) => void;
}

const Login: React.FC<LoginProps> = ({ onUserDataFetched }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    runUrl: 'https://prod1.datalayer.run',
    token: '',
  });

  const [state, setState] = useState<LoginState>({
    loading: false,
    error: '',
  });

  const { login } = useDatalayerAPI();

  const handleFormDataChange = useCallback(
    (field: keyof LoginFormData, value: string) => {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      if (state.error) {
        setState(prev => ({ ...prev, error: '' }));
      }
    },
    [state.error]
  );

  const handleSubmit = useCallback(async () => {
    try {
      const validationError = validateLoginForm(formData);
      if (validationError) {
        setState(prev => ({ ...prev, error: validationError }));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: '' }));

      // Use secure IPC to login
      const result = await login(formData.runUrl.trim(), formData.token.trim());

      if (!result.success) {
        setState(prev => ({
          ...prev,
          loading: false,
          error:
            result.message || 'Failed to login. Please check your credentials.',
        }));
      } else if (onUserDataFetched && (result as any).userData) {
        // Pass user data to parent component if available
        onUserDataFetched((result as any).userData);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: formatLoginError(error),
      }));
    }
  }, [formData, login, onUserDataFetched]);

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !state.loading) {
        handleSubmit();
      }
    },
    [handleSubmit, state.loading]
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        backgroundColor: 'canvas.default',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'canvas.overlay',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.default',
          p: 4,
          boxShadow: 'shadow.medium',
        }}
      >
        <Header iconSrc={iconImage} />

        <ErrorMessage error={state.error} />

        <Form
          formData={formData}
          state={state}
          onFormDataChange={handleFormDataChange}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
        />

        <Footer />
        <Version />
      </Box>
    </Box>
  );
};

export default Login;
