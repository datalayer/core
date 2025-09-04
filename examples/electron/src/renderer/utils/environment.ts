/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Environment detection utilities for the Electron application
 */

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
