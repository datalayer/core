/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export interface Environment {
  name: string;
  language?: string;
  title?: string;
  description?: string;
  dockerImage?: string;
  condaEnvironment?: string;
  pipRequirements?: string;
  tags?: string[];
  isDefault?: boolean;
  image?: string;
  resources?: {
    cpu?: { min?: number; max?: number; default?: number };
    memory?: { min?: number; max?: number; default?: number };
    gpu?: { min?: number; max?: number; default?: number };
  };
}

export interface ParsedEnvironmentDescription {
  imageUrl?: string | null;
  mainDescription?: string;
  gpuDetail?: string;
  packages?: string[];
}

export type EnvironmentType = 'GPU' | 'CPU';

export interface EnvironmentIconProps {
  environment: Environment;
  size?: number;
}

export interface EnvironmentTypeLabelProps {
  environment: Environment;
  size?: 'small' | 'large';
}

export interface EnvironmentDescriptionProps {
  environment: Environment;
}

export interface EnvironmentPackagesProps {
  packages: string[];
  maxVisible?: number;
}

export interface EnvironmentResourcesProps {
  resources: Environment['resources'];
}

export interface EnvironmentCardProps {
  environment: Environment;
  isSelected: boolean;
  onSelect: (envName: string) => void;
}

export interface EnvironmentSelectionSummaryProps {
  selectedEnv: string | null;
  environmentsCount: number;
}
