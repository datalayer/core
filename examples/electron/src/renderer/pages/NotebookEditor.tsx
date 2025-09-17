/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module NotebookEditor
 * @description Main notebook editor page that orchestrates notebook content loading, runtime management, and collaboration
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Box } from '@primer/react';
import { useCoreStore } from '@datalayer/core/lib/state';
import { NotebookViewProps } from '../../shared/types';
import { createStableNotebookKey } from '../utils/notebook';

// Import atomic components
import LoadingSpinner from '../components/notebook/LoadingSpinner';
import Header from '../components/notebook/Header';
import Content from '../components/notebook/Content';
import TerminateRuntimeDialog from '../components/TerminateRuntimeDialog';

// Import custom hooks
import { useNotebookContent } from '../hooks/useNotebookContent';
import { useRuntimeManagement } from '../hooks/useRuntimeManagement';
import { useCollaboration } from '../hooks/useCollaboration';

/**
 * Main notebook editor component that provides a complete notebook editing experience.
 * Integrates content loading, runtime management, collaboration, and UI controls.
 *
 * @component
 * @param props - Component properties
 * @param props.selectedNotebook - The notebook object to display and edit
 * @param props.onClose - Callback function when closing the notebook
 * @param props.onRuntimeTerminated - Callback function when runtime is terminated
 * @returns The rendered notebook editor page
 */
const NotebookViewer: React.FC<NotebookViewProps> = ({
  selectedNotebook,
  onClose,
  onRuntimeTerminated,
}) => {
  // Local state for UI components
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [notebookError, setNotebookError] = useState(false);

  // Get Datalayer configuration
  const { configuration } = useCoreStore();

  // Custom hooks for business logic
  const {
    notebookContent,
    loading: loadingNotebook,
    error: contentError,
  } = useNotebookContent({
    selectedNotebook: selectedNotebook || null,
  });

  const {
    serviceManager,
    runtime,
    creating: creatingRuntime,
    terminating: terminatingRuntime,
    terminated: runtimeTerminated,
    error: runtimeError,
    terminateRuntime,
  } = useRuntimeManagement({
    selectedNotebook: selectedNotebook || null,
    configuration,
  });

  const { collaborationProvider, collaborationReady } = useCollaboration({
    configuration,
    selectedNotebook: selectedNotebook || null,
    runtimeId: runtime?.uid || null,
    runtimeTerminated,
  });

  // Create a stable notebook key for collaboration and component mounting
  const stableNotebookKey = useMemo(() => {
    return createStableNotebookKey(
      selectedNotebook?.id,
      selectedNotebook?.path,
      selectedNotebook?.name
    );
  }, [selectedNotebook?.id, selectedNotebook?.path, selectedNotebook?.name]);

  // Store refs for cleanup to avoid stale closures
  const serviceManagerRef = React.useRef(serviceManager);
  const notebookRef = React.useRef(selectedNotebook);

  React.useEffect(() => {
    serviceManagerRef.current = serviceManager;
  }, [serviceManager]);

  React.useEffect(() => {
    notebookRef.current = selectedNotebook;
  }, [selectedNotebook]);

  // Clean up sessions and kernels when component unmounts
  useEffect(() => {
    return () => {
      // Only cleanup when component unmounts
      const manager = serviceManagerRef.current;
      const notebook = notebookRef.current;

      if (manager && !manager.isDisposed) {
        console.info(
          '[NotebookEditor] Component unmounting - scheduling cleanup'
        );

        // Schedule cleanup after current render cycle to avoid React warning
        setTimeout(() => {
          if (!manager.isDisposed) {
            try {
              // Stop all active sessions for this notebook
              const sessions = manager.sessions;
              if (sessions && notebook) {
                const runningSessions = Array.from(sessions.running());
                runningSessions.forEach(session => {
                  if (
                    session.path === notebook.path ||
                    session.name === notebook.name
                  ) {
                    console.info(
                      `[NotebookEditor] Shutting down session: ${session.id}`
                    );
                    sessions.shutdown(session.id).catch(err => {
                      console.warn(
                        '[NotebookEditor] Error shutting down session:',
                        err
                      );
                    });
                  }
                });
              }
            } catch (error) {
              console.warn('[NotebookEditor] Error during cleanup:', error);
            }
          }
        }, 0);
      }
    };
  }, []);

  // Handle notebook component errors
  const handleNotebookError = (error: Error) => {
    console.error('[NotebookViewer] Notebook component error:', error);
    setNotebookError(true);
  };

  // Reset notebook error state
  const handleResetNotebook = () => {
    setNotebookError(false);
  };

  // Handle runtime termination workflow
  const handleTerminateRuntime = async () => {
    try {
      await terminateRuntime();
      setShowTerminateDialog(false);

      // Notify parent about runtime termination to update navigation
      if (onRuntimeTerminated) {
        onRuntimeTerminated();
      }

      // Redirect to notebooks listing after terminating
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('[NotebookViewer] Error terminating runtime:', error);
      // Error is handled by the useRuntimeManagement hook
    }
  };

  // Show loading state while loading notebook or creating runtime
  if (loadingNotebook || creatingRuntime) {
    return (
      <LoadingSpinner
        loading={true}
        loadingNotebook={loadingNotebook}
        isCreatingRuntime={creatingRuntime}
      />
    );
  }

  // Show error state
  if (contentError || runtimeError) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          bg: 'canvas.subtle',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          m: 2,
        }}
        role="alert"
        aria-live="assertive"
      >
        <Box
          sx={{
            color: 'danger.fg',
            fontSize: 2,
            fontWeight: 'semibold',
            mb: 2,
          }}
        >
          Failed to load notebook
        </Box>
        <Box sx={{ color: 'fg.muted', fontSize: 1 }}>
          {contentError || runtimeError}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Header
        selectedNotebook={selectedNotebook || null}
        hasCollaboration={collaborationReady && !!collaborationProvider}
        isTerminating={terminatingRuntime}
        hasServiceManager={!!serviceManager}
        onTerminateRuntime={() => setShowTerminateDialog(true)}
      />

      <Content
        notebookContent={notebookContent}
        serviceManager={serviceManager}
        collaborationProvider={collaborationProvider}
        stableNotebookKey={stableNotebookKey}
        notebookError={notebookError}
        onNotebookError={handleNotebookError}
        onResetNotebook={handleResetNotebook}
      />

      <TerminateRuntimeDialog
        isOpen={showTerminateDialog}
        isTerminating={terminatingRuntime}
        itemName={selectedNotebook?.name || ''}
        itemType="notebook"
        error={runtimeError}
        onConfirm={handleTerminateRuntime}
        onCancel={() => setShowTerminateDialog(false)}
      />
    </Box>
  );
};

export default NotebookViewer;
