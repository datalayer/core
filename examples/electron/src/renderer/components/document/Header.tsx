/**
 * @module renderer/components/document/Header
 * @description Document editor header component with runtime controls and collaboration status.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Heading, Text, Button, Flash } from '@primer/react';
import { XIcon } from '@primer/octicons-react';
import { DocumentHeaderProps } from '../../../shared/types';

/**
 * Header component for the document editor.
 * Displays document title, runtime status, collaboration controls, and runtime management.
 * @component
 * @param props - Component props
 * @param props.selectedDocument - The currently selected document
 * @param props.serviceManager - Jupyter service manager instance
 * @param props.documentRuntime - Runtime information for the document
 * @param props.isTerminatingRuntime - Whether runtime is being terminated
 * @param props.collaborationEnabled - Whether collaboration is enabled
 * @param props.collaborationStatus - Current collaboration connection status
 * @param props.runtimeError - Any runtime error to display
 * @param props.onStopRuntime - Callback to terminate the runtime
 * @param props.onToggleCollaboration - Callback to toggle collaboration
 * @returns Rendered document header
 */
const Header: React.FC<DocumentHeaderProps> = ({
  selectedDocument,
  serviceManager,
  documentRuntime,
  isTerminatingRuntime,
  collaborationEnabled,
  collaborationStatus,
  runtimeError,
  onStopRuntime,
  onToggleCollaboration,
}) => {
  return (
    <Box
      sx={{
        p: 3,
        borderBottom: '1px solid',
        borderColor: 'border.default',
        bg: 'canvas.subtle',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Heading as="h2" sx={{ fontSize: 3, flex: 1 }}>
          {selectedDocument.name}
        </Heading>

        {/* Runtime Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {serviceManager && (
            <Button
              variant="danger"
              size="small"
              leadingVisual={XIcon}
              onClick={onStopRuntime}
              disabled={isTerminatingRuntime}
            >
              {isTerminatingRuntime ? 'Terminating...' : 'Terminate Runtime'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Runtime Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Runtime:</Text>
        {serviceManager ? (
          <Text sx={{ fontSize: 1, color: 'success.fg' }}>
            ✓ Connected ({documentRuntime?.runtime?.pod_name})
          </Text>
        ) : (
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Not connected</Text>
        )}
      </Box>

      {/* Collaboration Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Collaboration:</Text>
        {collaborationEnabled ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Text
              sx={{
                fontSize: 1,
                color:
                  collaborationStatus === 'connected'
                    ? 'success.fg'
                    : collaborationStatus === 'error'
                      ? 'danger.fg'
                      : 'fg.muted',
              }}
            >
              {collaborationStatus === 'connected' && '✓ Connected'}
              {collaborationStatus === 'connecting' && '⏳ Connecting...'}
              {collaborationStatus === 'disconnected' && '○ Disconnected'}
              {collaborationStatus === 'error' && '✗ Error'}
            </Text>
            <Button
              size="small"
              variant="invisible"
              onClick={onToggleCollaboration}
              sx={{ fontSize: 0 }}
            >
              {collaborationStatus === 'connected' ? 'Disable' : 'Enable'}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Disabled</Text>
            <Button
              size="small"
              variant="invisible"
              onClick={onToggleCollaboration}
              sx={{ fontSize: 0 }}
            >
              Enable
            </Button>
          </Box>
        )}
      </Box>

      {selectedDocument.description && (
        <Text sx={{ color: 'fg.subtle', mt: 1 }}>
          {selectedDocument.description}
        </Text>
      )}

      {/* Runtime Error Display */}
      {runtimeError && (
        <Flash variant="danger" sx={{ mt: 2 }}>
          Runtime Error: {runtimeError}
        </Flash>
      )}
    </Box>
  );
};

export default Header;
