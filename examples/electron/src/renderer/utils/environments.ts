/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  Environment,
  EnvironmentType,
  ParsedEnvironmentDescription,
} from '../../shared/types';

// ============================================================================
// Electron Application Environment Detection
// ============================================================================

/**
 * Environment modes for the application
 */
export type EnvironmentMode = 'development' | 'production' | 'dev-prod';

/**
 * Check if the application is running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if the application is running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if the application is running in dev-prod mode
 * (production build but with dev tools enabled for local testing)
 */
export function isDevProd(): boolean {
  return process.env.ELECTRON_DEV_PROD === 'true';
}

/**
 * Check if developer tools should be enabled
 * Dev tools are enabled in:
 * - Development mode
 * - Dev-prod mode (production build with dev tools for local testing)
 * Dev tools are disabled in:
 * - Pure production mode (for distribution)
 */
export function shouldEnableDevTools(): boolean {
  return isDevelopment() || isDevProd();
}

/**
 * Check if the application should use production security settings
 * Production security is enabled in:
 * - Production mode (pure production for distribution)
 * - Dev-prod mode (production-like build for testing)
 * Production security is disabled in:
 * - Development mode (for easier debugging)
 */
export function shouldUseProductionSecurity(): boolean {
  return isProduction() || isDevProd();
}

/**
 * Get the current environment mode
 */
export function getEnvironmentMode(): EnvironmentMode {
  if (isDevProd()) {
    return 'dev-prod';
  }
  if (isProduction()) {
    return 'production';
  }
  return 'development';
}

/**
 * Log the current environment configuration
 */
export function logEnvironmentConfig(): void {
  const mode = getEnvironmentMode();
  const devToolsEnabled = shouldEnableDevTools();
  const productionSecurity = shouldUseProductionSecurity();

  console.log(`[Environment] Mode: ${mode}`);
  console.log(
    `[Environment] Dev Tools: ${devToolsEnabled ? 'enabled' : 'disabled'}`
  );
  console.log(
    `[Environment] Production Security: ${productionSecurity ? 'enabled' : 'disabled'}`
  );
}

// ============================================================================
// Jupyter/Compute Environment Utilities
// ============================================================================

/**
 * Determines the environment type based on name patterns
 */
export const getEnvironmentType = (env: Environment): EnvironmentType => {
  const isGPU =
    env.name === 'ai-env' ||
    env.name.includes('gpu') ||
    env.name.includes('ai');
  return isGPU ? 'GPU' : 'CPU';
};

/**
 * Checks if environment is GPU type based on environment object
 */
export const isGPUEnvironmentType = (env: Environment): boolean => {
  return getEnvironmentType(env) === 'GPU';
};

/**
 * Formats resource information for display
 */
export const formatResources = (
  resources: Record<string, unknown>
): string[] => {
  if (!resources) return [];

  const formatted = [];
  if (resources.cpu) {
    formatted.push(`${resources.cpu} CPU cores`);
  }
  if (resources.memory) {
    formatted.push(`${resources.memory} RAM`);
  }
  if (resources.gpu && resources.gpu !== '0') {
    formatted.push(`${resources.gpu} GPU`);
  }
  return formatted;
};

/**
 * Parses HTML description to extract structured data
 */
export const parseEnvironmentDescription = (
  description: string
): ParsedEnvironmentDescription | null => {
  if (!description) return null;

  // Extract image URL
  const imgMatch = description.match(/<img\s+src="([^"]+)"[^>]*>/);
  const imageUrl = imgMatch ? imgMatch[1] : null;

  // Extract main description (bold text)
  const mainDescMatch = description.match(/<b>([^<]+)<\/b>/);
  const mainDescription = mainDescMatch ? mainDescMatch[1] : '';

  // Extract GPU details
  const gpuMatch = description.match(/GPU detail:\s*([^<]+)/);
  const gpuDetail = gpuMatch ? gpuMatch[1].trim() : '';

  // Extract packages
  const packagesMatch = description.match(/Packages:\s*([^<]+)/);
  const packages = packagesMatch
    ? packagesMatch[1].trim().replace(/\.\.\.$/, '')
    : '';

  return {
    imageUrl,
    mainDescription,
    gpuDetail,
    packages: packages ? packages.split(',').map(p => p.trim()) : [],
  };
};

/**
 * Checks if environment is GPU type based on name patterns
 */
export const isGPUEnvironment = (envName: string): boolean => {
  return (
    envName === 'ai-env' || envName.includes('gpu') || envName.includes('ai')
  );
};
