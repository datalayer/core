/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Box, Text, Button, Dialog, Spinner } from '@primer/react';
import { AlertIcon, XIcon } from '@primer/octicons-react';
import { DocumentTerminateDialogProps } from '../../../shared/types';

const TerminateDialog: React.FC<DocumentTerminateDialogProps> = ({
  isOpen,
  isTerminating,
  runtimeName,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={onCancel}
      aria-labelledby="terminate-runtime-dialog-title"
    >
      <Dialog.Header id="terminate-runtime-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AlertIcon size={16} fill="danger.fg" />
          Terminate Runtime
        </Box>
      </Dialog.Header>
      <Box sx={{ p: 3 }}>
        <Text sx={{ mb: 3 }}>
          Are you sure you want to terminate the runtime for this document?
          This will stop all running processes and cannot be undone.
        </Text>
        {runtimeName && (
          <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 3 }}>
            Runtime: {runtimeName}
          </Text>
        )}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="default"
            onClick={onCancel}
            disabled={isTerminating}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isTerminating}
            leadingVisual={XIcon}
          >
            {isTerminating ? (
              <>
                <Spinner size="small" sx={{ mr: 2 }} />
                Terminating...
              </>
            ) : (
              'Terminate Runtime'
            )}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default TerminateDialog;