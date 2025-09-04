/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Proxy module for @jupyterlab/services
 * Properly handles CommonJS/ESM interop
 */

// Import from the actual @jupyterlab/services package
// Use the package name directly, not the lib path
import servicesDefault from '@jupyterlab/services';
import * as servicesNamed from '@jupyterlab/services';

// The default export is actually a function that returns the CommonJS module
// This is how Vite bundles CommonJS modules
const services =
  typeof servicesDefault === 'function'
    ? servicesDefault()
    : servicesDefault || servicesNamed;

// Log what we got for debugging
console.log('=== jupyterlab-services-proxy ===');
console.log('servicesDefault type:', typeof servicesDefault);
console.log('servicesDefault:', servicesDefault);
console.log('servicesNamed:', servicesNamed);
console.log('services:', services);
console.log(
  'services keys:',
  services ? Object.keys(services) : 'services is null/undefined'
);
console.log('ServiceManager:', services?.ServiceManager);

// Verify we have the real exports
if (!services || !services.ServiceManager) {
  console.error('ServiceManager not found in services:', services);
  throw new Error('Failed to import ServiceManager from @jupyterlab/services');
}

// Re-export everything
export const ServiceManager = services.ServiceManager;
export const ServerConnection = services.ServerConnection;
export const SessionManager = services.SessionManager;
export const KernelManager = services.KernelManager;
export const ContentsManager = services.ContentsManager;
export const TerminalManager = services.TerminalManager;
export const SettingManager = services.SettingManager;
export const WorkspaceManager = services.WorkspaceManager;
export const EventManager = services.EventManager;
export const NbConvertManager = services.NbConvertManager;
export const KernelSpecManager = services.KernelSpecManager;
export const UserManager = services.UserManager;
export const BuildManager = services.BuildManager;
export const BaseManager = services.BaseManager;
export const ConfigSection = services.ConfigSection;
export const ConfigSectionManager = services.ConfigSectionManager;
export const IConfigSectionManager = services.IConfigSectionManager;
export const ConfigWithDefaults = services.ConfigWithDefaults;
export const ConnectionStatus = services.ConnectionStatus;
export const Drive = services.Drive;
export const RestContentProvider = services.RestContentProvider;

// Export namespaces
export const Kernel = services.Kernel;
export const KernelMessage = services.KernelMessage;
export const Session = services.Session;
export const Contents = services.Contents;
export const Terminal = services.Terminal;
export const Setting = services.Setting;
export const Workspace = services.Workspace;
export const Event = services.Event;
export const Nbconvert = services.Nbconvert;
export const KernelSpec = services.KernelSpec;
export const User = services.User;

// Export sub-module exports
export const KernelAPI = services.KernelAPI;
export const KernelConnection = services.KernelConnection;
export const CommsOverSubshells = services.CommsOverSubshells;
export const KernelSpecAPI = services.KernelSpecAPI;

// Note: Cannot use wildcard export due to CJS/ESM interop issues
// All exports are manually defined above

console.log('=== Proxy setup complete ===');
console.log('Exported ServiceManager:', ServiceManager);
console.log('Exported ServerConnection:', ServerConnection);
