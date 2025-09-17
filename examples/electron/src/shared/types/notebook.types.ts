/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module NotebookTypes
 * @description TypeScript type definitions for notebook data structures, components, and operations
 */

import type { ServiceManager } from '@jupyterlab/services';
import { INotebookContent } from '@jupyterlab/nbformat';
import type { ElectronCollaborationProvider } from '../../renderer/services/electronCollaborationProvider';

/**
 * Notebook data structure interface
 * @interface
 */
export interface NotebookData {
  id: string;
  name: string;
  path: string;
  cdnUrl?: string;
  description?: string;
}

export interface NotebookViewProps {
  selectedNotebook?: NotebookData | null;
  onClose?: () => void;
  onRuntimeTerminated?: () => void;
}

export interface NotebookContentState {
  content: INotebookContent | null;
  loading: boolean;
  error: string | null;
}

export interface RuntimeState {
  serviceManager: ServiceManager.IManager | null;
  runtime: any;
  creating: boolean;
  terminating: boolean;
  terminated: boolean;
  error: string | null;
}

export interface CollaborationState {
  provider: ElectronCollaborationProvider | null;
  ready: boolean;
  error: string | null;
}

export interface NotebookLoadingStateProps {
  loading: boolean;
  loadingNotebook: boolean;
  isCreatingRuntime: boolean;
  message?: string;
}

export interface NotebookHeaderProps {
  selectedNotebook: NotebookData | null;
  hasCollaboration: boolean;
  isTerminating: boolean;
  hasServiceManager: boolean;
  onTerminateRuntime: () => void;
}

export interface TerminateRuntimeDialogProps {
  isOpen: boolean;
  isTerminating: boolean;
  notebookName: string | null;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface NotebookErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: Error) => void;
}

export interface NotebookContentProps {
  notebookContent: INotebookContent | null;
  serviceManager: ServiceManager.IManager | null;
  collaborationProvider: ElectronCollaborationProvider | null;
  stableNotebookKey: string;
  notebookError: boolean;
  onNotebookError: (error: Error) => void;
  onResetNotebook: () => void;
}

export interface UseNotebookContentOptions {
  selectedNotebook: NotebookData | null;
}

export interface UseNotebookContentReturn {
  notebookContent: INotebookContent | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseRuntimeManagementOptions {
  selectedNotebook: NotebookData | null;
  configuration: {
    token?: string;
    runUrl?: string;
  } | null;
}

export interface UseRuntimeManagementReturn {
  serviceManager: ServiceManager.IManager | null;
  runtime: any;
  creating: boolean;
  terminating: boolean;
  terminated: boolean;
  error: string | null;
  terminateRuntime: () => Promise<void>;
}

export interface UseCollaborationOptions {
  configuration: {
    token?: string;
    runUrl?: string;
  } | null;
  selectedNotebook: NotebookData | null;
  runtimeId: string | null;
  runtimeTerminated: boolean;
}

export interface UseCollaborationReturn {
  collaborationProvider: ElectronCollaborationProvider | null;
  collaborationReady: boolean;
  disposeCollaboration: () => void;
}
