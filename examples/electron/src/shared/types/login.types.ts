/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export interface LoginFormData {
  runUrl: string;
  token: string;
}

export interface LoginState {
  loading: boolean;
  error: string;
}

export interface LoginProps {
  onUserDataFetched?: (userData: Record<string, unknown>) => void;
}

export interface LoginHeaderProps {
  iconSrc: string;
}

export interface LoginFormProps {
  formData: LoginFormData;
  state: LoginState;
  onFormDataChange: (field: keyof LoginFormData, value: string) => void;
  onSubmit: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export interface LoginErrorProps {
  error: string;
}

export interface LoginButtonProps {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

export interface LoginFooterProps {
  // No props needed for static footer
}

export interface LoginVersionProps {
  // No props needed for version display
}
